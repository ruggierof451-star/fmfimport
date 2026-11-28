import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeCartTotals, extractVatCents } from "@/lib/pricing";
import { getPricingSettings, toShippingRules } from "@/lib/settings";
import { findVariant, lineDisplayName, lineIsOutOfStock, lineMaxQty, lineUnitPriceCents } from "@/lib/variants";
import { cleanProductName } from "@/lib/product-art";
import { getSession } from "@/lib/auth";
import { validateDiscountCode } from "@/lib/discounts";
import { subscribeNewsletterAction } from "@/lib/newsletter-actions";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { formatEuro } from "@/lib/pricing";
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from "@/lib/email";
import { reserveStockInTx, OutOfStockError } from "@/lib/order-stock";

const SITE_URL = process.env.SITE_URL || "https://www.fmfcards.com";

/**
 * Crea un ordine. Il totale NON viene mai letto dal corpo della richiesta: viene
 * ricalcolato qui da zero a partire dai prodotti nel database, con le regole di
 * pricing correnti. Se un prodotto non è più disponibile o la quantità richiesta
 * supera lo stock reale, l'ordine viene rifiutato (niente vendite "fantasma").
 */
const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive().max(999),
        packaging: z.enum(["SEALED", "NO_WRAP", "DAMAGED"]).optional(),
        variantId: z.string().optional(),
      })
    )
    .min(1),
  contact: z.object({ email: z.string().email(), phone: z.string().min(5) }),
  shipping: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    street: z.string().min(3),
    postalCode: z.string().min(3),
    city: z.string().min(1),
    province: z.string().min(1),
    country: z.string().default("IT"),
  }),
  invoice: z
    .object({
      requested: z.boolean(),
      companyName: z.string().optional(),
      vatNumber: z.string().optional(),
      sdiCode: z.string().optional(),
    })
    .optional(),
  paymentMethod: z.enum(["CARD", "BANK_TRANSFER"]).default("CARD"),
  newsletter: z.boolean().optional(),
  acceptedTerms: z.literal(true),
  customerNote: z.string().optional(),
  couponCode: z.string().max(40).optional(),
});

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `FMF-${y}${m}${d}-${rand}`;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati del modulo non validi.", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const settings = await getPricingSettings();
  const shippingRules = toShippingRules(settings);
  const session = await getSession();
  const isReseller = session?.role === "RESELLER";

  // La fattura è riservata ai rivenditori approvati (account con ruolo RESELLER, nati da
  // una richiesta "Lavora con noi" accettata manualmente): per chiunque altro una richiesta
  // di fattura nel corpo della richiesta viene ignorata, non fidandosi mai del client.
  if (isReseller && body.invoice?.requested && (!body.invoice.companyName?.trim() || !body.invoice.vatNumber?.trim())) {
    return NextResponse.json(
      { error: "Per la fattura servono ragione sociale e partita IVA." },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: body.items.map((i) => i.productId) } },
    include: { variants: true, resellerTiers: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const problems: string[] = [];
  const validLines = body.items.flatMap((item) => {
    const product = byId.get(item.productId);
    if (!product || !product.published) {
      problems.push(`Un articolo del carrello non è più disponibile.`);
      return [];
    }
    const variant = findVariant(product.variants, item.variantId);
    if (item.variantId && !variant) {
      problems.push(`Una variante di "${cleanProductName(product.name)}" non è più disponibile.`);
      return [];
    }
    const displayName = lineDisplayName(cleanProductName(product.name), variant);
    if (lineIsOutOfStock(product.stockQty, variant)) {
      problems.push(`"${displayName}" è esaurito.`);
      return [];
    }
    const cap = lineMaxQty(product.stockQty, variant);
    if (item.quantity > cap) {
      problems.push(`Disponibili solo ${cap} pezzi di "${displayName}".`);
      return [];
    }
    // Le varianti non hanno scelta di confezione.
    const packaging = variant ? ("SEALED" as const) : (item.packaging ?? ("SEALED" as const));
    return [{ product, variant, displayName, quantity: item.quantity, packaging }];
  });

  if (problems.length) {
    return NextResponse.json({ error: "Alcuni articoli non sono più disponibili come richiesto.", problems }, { status: 409 });
  }

  const customerEmail = session?.email ?? body.contact.email;
  const discount = body.couponCode
    ? await validateDiscountCode(body.couponCode, { userId: session?.userId, email: customerEmail })
    : { ok: false as const };
  if (body.couponCode && !discount.ok) {
    return NextResponse.json({ error: discount.error ?? "Codice sconto non valido." }, { status: 400 });
  }

  const totals = computeCartTotals(
    validLines.map(({ product, variant, quantity, packaging }) => ({
      unitPriceCents: lineUnitPriceCents(product, variant, isReseller, packaging, quantity),
      quantity,
    })),
    shippingRules,
    discount.ok ? discount.percentOffBps : 0
  );

  const orderNumber = generateOrderNumber();

  // I prezzi del sito sono SEMPRE IVA inclusa: la fattura non aggiunge alcun supplemento,
  // riporta solo l'IVA già compresa nel totale (vedi extractVatCents).
  const invoiceRequested = isReseller && (body.invoice?.requested ?? false);
  const invoiceVatCents = extractVatCents(totals.totalCents, settings.invoiceVatRateBps);
  const grandTotalCents = totals.totalCents;

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: session?.userId,
        guestEmail: session ? undefined : body.contact.email,
        status: "PENDING_PAYMENT",
        paymentMethod: body.paymentMethod,
        paymentStatus: "PENDING",
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        couponCode: discount.ok ? discount.code : null,
        shippingCents: totals.shippingCents,
        invoiceVatCents,
        totalCents: grandTotalCents,
        shipName: `${body.shipping.firstName} ${body.shipping.lastName}`.trim(),
        shipStreet: body.shipping.street,
        shipPostal: body.shipping.postalCode,
        shipCity: body.shipping.city,
        shipProvince: body.shipping.province,
        shipCountry: body.shipping.country,
        shipPhone: body.contact.phone,
        invoiceRequested,
        companyName: invoiceRequested ? body.invoice?.companyName : undefined,
        vatNumber: invoiceRequested ? body.invoice?.vatNumber : undefined,
        sdiCode: invoiceRequested ? body.invoice?.sdiCode : undefined,
        customerNote: body.customerNote,
        // Carta: le scorte si scalano solo a pagamento avvenuto (vedi markOrderPaid), non ora,
        // così un checkout Stripe abbandonato non trattiene magazzino. Bonifico: ordine già
        // confermato, quindi le scorte si impegnano subito.
        stockReleased: body.paymentMethod !== "BANK_TRANSFER",
        items: {
          create: validLines.map(({ product, variant, displayName, quantity, packaging }, i) => ({
            productId: product.id,
            variantId: variant?.id ?? null,
            variantNameSnapshot: variant?.name ?? null,
            nameSnapshot: displayName,
            unitPriceCentsSnapshot: totals.lines[i].unitPriceCents,
            // il costo d'acquisto è quello del prodotto principale: per una variante (es. busta
            // singola) non ha senso, quindi resta vuoto e non falsa i margini in Guadagni
            supplierCostCentsSnapshot: variant ? null : product.supplierCostCents,
            packagingSnapshot: variant ? null : packaging,
            quantity,
            lineTotalCents: totals.lines[i].lineTotalCents,
          })),
        },
        statusHistory: {
          create: [{ status: "PENDING_PAYMENT", note: "Ordine creato dal cliente.", changedBy: "system" }],
        },
      },
    });

    // Solo bonifico: scala subito le scorte (ordine già confermato). Per carta si aspetta
    // il pagamento (markOrderPaid), così un checkout abbandonato non trattiene magazzino.
    if (body.paymentMethod === "BANK_TRANSFER") {
      await reserveStockInTx(
        tx,
        validLines.map(({ product, variant, quantity }) => ({
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity,
          stockQty: product.stockQty,
        }))
      );
    }

    return created;
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return NextResponse.json({ error: "Spiacenti: la disponibilità di un articolo è appena cambiata. Aggiorna il carrello e riprova." }, { status: 409 });
    }
    throw err;
  }

  // Iscrizione alla newsletter, se il cliente l'ha chiesta al checkout. Vale il doppio
  // consenso come dal modulo del sito: parte un'email di conferma e nessuna email di
  // marketing viene inviata finché non clicca il link. Non deve mai bloccare l'ordine.
  if (body.newsletter) {
    await subscribeNewsletterAction({
      email: customerEmail,
      firstName: body.shipping.firstName,
      interests: [],
      consent: true,
    }).catch((err) => console.error("[checkout] iscrizione newsletter fallita:", err));
  }

  // Bonifico: metodo secondario, nessuna verifica automatica del pagamento. L'ordine resta
  // PENDING_PAYMENT finché un admin non lo conferma manualmente (vedi updateOrderStatusAction);
  // qui l'email di conferma parte subito, con le istruzioni per il bonifico incluse.
  if (body.paymentMethod === "BANK_TRANSFER") {
    await sendOrderConfirmationEmail({
      to: customerEmail,
      orderNumber: order.orderNumber,
      totalFormatted: formatEuro(order.totalCents),
      paymentMethod: "BANK_TRANSFER",
      items: validLines.map(({ displayName, quantity }, i) => ({
        name: displayName,
        quantity,
        lineTotalFormatted: formatEuro(totals.lines[i].lineTotalCents),
      })),
    }).catch((err) => console.error("[checkout] invio email conferma fallito:", err));

    await sendAdminNewOrderNotification({
      orderNumber: order.orderNumber,
      orderId: order.id,
      totalFormatted: formatEuro(order.totalCents),
      customerEmail,
      paymentMethod: order.paymentMethod,
      itemsSummary: validLines.map(({ displayName, quantity }) => `${quantity}× ${displayName}`).join(", "),
    }).catch((err) => console.error("[checkout] invio notifica admin fallito:", err));

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents: order.totalCents,
      invoiceVatCents: order.invoiceVatCents,
      redirectUrl: `/ordine/${order.id}`,
    });
  }

  // Carta: il pagamento vero avviene su Stripe, l'ordine resta PENDING_PAYMENT finché il
  // webhook non conferma il pagamento (vedi /api/webhooks/stripe). Il contatore utilizzi
  // del codice sconto si incrementa lì, non qui, perché un checkout abbandonato su Stripe
  // non deve "consumare" l'utilizzo. Niente email di conferma qui per lo stesso motivo.
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Il pagamento con carta non è ancora configurato. Scegli il bonifico oppure contatta l'assistenza." },
      { status: 503 }
    );
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: grandTotalCents,
            product_data: {
              name: `Ordine ${order.orderNumber} · FMF Cards`,
              description: validLines.map(({ displayName, quantity }) => `${quantity}× ${displayName}`).join(", "),
            },
          },
        },
      ],
      metadata: { orderId: order.id },
      success_url: `${SITE_URL}/ordine/${order.id}?pagamento=ok`,
      cancel_url: `${SITE_URL}/checkout?pagamento=annullato`,
    });

    if (!checkoutSession.url) throw new Error("Stripe non ha restituito un URL di checkout.");

    // Serve a verificare l'incasso anche se il webhook non arriva (vedi order-payment.ts).
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: checkoutSession.id } });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents: order.totalCents,
      invoiceVatCents: order.invoiceVatCents,
      checkoutUrl: checkoutSession.url,
    });
  } catch (err) {
    console.error("[checkout] creazione sessione Stripe fallita:", err);
    return NextResponse.json(
      { error: "Impossibile avviare il pagamento. Riprova tra poco." },
      { status: 502 }
    );
  }
}
