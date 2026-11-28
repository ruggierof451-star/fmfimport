import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification, sendPaymentFailedEmail } from "@/lib/email";
import { recordDiscountCodeUsage } from "@/lib/discounts";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { releaseOrderStock, reserveOrderStock } from "@/lib/order-stock";

/**
 * Unico punto in cui un ordine passa a "pagato". Lo usano sia il webhook di Stripe sia
 * la pagina dell'ordine al ritorno dal pagamento: così l'ordine si conferma da solo
 * anche se il webhook non è configurato o non arriva, senza interventi manuali.
 *
 * È idempotente: se l'ordine risulta già pagato non fa nulla (niente stato sovrascritto,
 * niente email doppie, niente doppio conteggio del codice sconto). L'aggiornamento di
 * stato avviene con una updateMany condizionata su paymentStatus PENDING, così due
 * chiamate in parallelo (webhook + ritorno del cliente) non possono duplicare nulla.
 */
export async function markOrderPaid(orderId: string, source: string): Promise<{ confirmed: boolean }> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.paymentStatus !== "PENDING") return { confirmed: false };

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "PENDING" },
    data: { paymentStatus: "PAID", status: "PAYMENT_CONFIRMED" },
  });
  if (claimed.count === 0) return { confirmed: false }; // già confermato da un'altra chiamata

  // Pagamento con carta andato a buon fine: ora (non prima) le scorte vengono scalate.
  await reserveOrderStock(order.id);

  await prisma.orderStatusHistory.create({
    data: { orderId: order.id, status: "PAYMENT_CONFIRMED", note: `Pagamento confermato (${source}).`, changedBy: source },
  });

  if (order.couponCode) {
    recordDiscountCodeUsage(order.couponCode).catch((err) => console.error("[pagamento] conteggio utilizzi codice sconto fallito:", err));
  }

  const customerEmail =
    order.guestEmail ?? (order.userId ? (await prisma.user.findUnique({ where: { id: order.userId } }))?.email ?? null : null);

  if (customerEmail) {
    await sendOrderConfirmationEmail({
      to: customerEmail,
      orderNumber: order.orderNumber,
      totalFormatted: formatEuro(order.totalCents),
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        lineTotalFormatted: formatEuro(item.lineTotalCents),
      })),
    }).catch((err) => console.error("[pagamento] invio email conferma fallito:", err));

    await sendAdminNewOrderNotification({
      orderNumber: order.orderNumber,
      orderId: order.id,
      totalFormatted: formatEuro(order.totalCents),
      customerEmail,
      paymentMethod: order.paymentMethod,
      itemsSummary: order.items.map((item) => `${item.quantity}× ${item.nameSnapshot}`).join(", "),
    }).catch((err) => console.error("[pagamento] invio notifica admin fallito:", err));
  }

  return { confirmed: true };
}

/**
 * Pagamento con carta non riuscito o pagina di pagamento scaduta: l'ordine, se è ancora
 * in attesa, viene annullato e il cliente riceve l'email "payment_failed". Idempotente
 * come markOrderPaid: un ordine già pagato non viene mai toccato.
 */
export async function markOrderPaymentFailed(orderId: string, source: string): Promise<{ failed: boolean }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus !== "PENDING") return { failed: false };

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED", status: "CANCELLED" },
  });
  if (claimed.count === 0) return { failed: false };

  await prisma.orderStatusHistory.create({
    data: { orderId: order.id, status: "CANCELLED", note: `Pagamento non riuscito (${source}).`, changedBy: source },
  });

  // Pagamento fallito: l'ordine è annullato, le scorte impegnate tornano disponibili.
  await releaseOrderStock(order.id);

  const customerEmail =
    order.guestEmail ?? (order.userId ? (await prisma.user.findUnique({ where: { id: order.userId } }))?.email ?? null : null);
  if (customerEmail) {
    await sendPaymentFailedEmail({
      to: customerEmail,
      orderNumber: order.orderNumber,
      totalFormatted: formatEuro(order.totalCents),
    }).catch((err) => console.error("[pagamento] email pagamento fallito non inviata:", err));
  }
  return { failed: true };
}

/**
 * Allinea gli ordini recenti ancora "in attesa di pagamento" che però risultano già
 * incassati su Stripe (webhook mancato o in ritardo). Pensata per essere richiamata
 * quando l'admin apre la lista ordini: nessun controllo manuale, nessun ordine pagato
 * che resta in sospeso. Restituisce quanti ordini sono stati confermati.
 */
export async function reconcilePendingStripeOrders(limit = 25, withinDays = 7): Promise<number> {
  if (!isStripeConfigured()) return 0;
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const pending = await prisma.order.findMany({
    where: { paymentStatus: "PENDING", stripeSessionId: { not: null }, createdAt: { gte: since } },
    select: { id: true, paymentStatus: true, stripeSessionId: true },
    take: limit,
  });

  let confirmed = 0;
  for (const order of pending) {
    if (await syncOrderPaymentFromStripe(order)) confirmed += 1;
  }
  return confirmed;
}

/**
 * Chiede a Stripe se la sessione di pagamento di un ordine risulta incassata e, in caso
 * affermativo, conferma l'ordine. Rete di sicurezza per quando il webhook manca o tarda:
 * non solleva mai (un problema con Stripe non deve rompere la pagina dell'ordine).
 */
export async function syncOrderPaymentFromStripe(order: {
  id: string;
  paymentStatus: string;
  stripeSessionId: string | null;
}): Promise<boolean> {
  if (order.paymentStatus !== "PENDING" || !order.stripeSessionId || !isStripeConfigured()) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
    if (session.payment_status !== "paid") return false;
    const { confirmed } = await markOrderPaid(order.id, "stripe");
    return confirmed;
  } catch (err) {
    console.error("[pagamento] verifica sessione Stripe fallita:", err);
    return false;
  }
}
