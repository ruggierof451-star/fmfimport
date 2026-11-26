import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { formatEuro } from "@/lib/pricing";
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from "@/lib/email";

/**
 * Riceve gli eventi di pagamento da Stripe. Qui, e solo qui, un ordine passa da
 * PENDING_PAYMENT a PAYMENT_CONFIRMED: finché Stripe non conferma l'incasso, l'ordine
 * resta in attesa e nessuna email di conferma parte. La firma della richiesta viene
 * sempre verificata: non ci si fida mai di un evento che non sia davvero di Stripe.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configurato." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook stripe] firma non valida:", err);
    return NextResponse.json({ error: "Firma non valida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as { metadata?: { orderId?: string } | null };
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      console.error("[webhook stripe] sessione senza orderId nei metadata.");
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) {
      console.error(`[webhook stripe] ordine ${orderId} non trovato.`);
      return NextResponse.json({ received: true });
    }

    // Idempotente: se l'evento arriva più volte (succede, Stripe può ritentare) non
    // mandiamo due volte le stesse email né sovrascriviamo uno stato successivo.
    if (order.paymentStatus === "PENDING") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "PAYMENT_CONFIRMED",
          statusHistory: {
            create: [{ status: "PAYMENT_CONFIRMED", note: "Pagamento confermato da Stripe.", changedBy: "stripe" }],
          },
        },
      });

      const customerEmail = order.guestEmail ?? (order.userId ? (await prisma.user.findUnique({ where: { id: order.userId } }))?.email : null);
      if (customerEmail) {
        sendOrderConfirmationEmail({
          to: customerEmail,
          orderNumber: order.orderNumber,
          totalFormatted: formatEuro(order.totalCents),
          items: order.items.map((item) => ({
            name: item.nameSnapshot,
            quantity: item.quantity,
            lineTotalFormatted: formatEuro(item.lineTotalCents),
          })),
        }).catch((err) => console.error("[webhook stripe] invio email conferma fallito:", err));

        sendAdminNewOrderNotification({
          orderNumber: order.orderNumber,
          orderId: order.id,
          totalFormatted: formatEuro(order.totalCents),
          customerEmail,
          paymentMethod: order.paymentMethod,
          itemsSummary: order.items.map((item) => `${item.quantity}× ${item.nameSnapshot}`).join(", "),
        }).catch((err) => console.error("[webhook stripe] invio notifica admin fallito:", err));
      }
    }
  }

  return NextResponse.json({ received: true });
}
