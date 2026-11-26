import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeCartTotals, extractVatCents, unitPriceCentsFor } from "@/lib/pricing";
import { getPricingSettings, toShippingRules } from "@/lib/settings";
import { isOutOfStock, maxOrderableQty } from "@/lib/stock";
import { cleanProductName } from "@/lib/product-art";
import { getSession } from "@/lib/auth";
import { validateDiscountCode, recordDiscountCodeUsage } from "@/lib/discounts";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

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

  if (body.invoice?.requested && (!body.invoice.companyName?.trim() || !body.invoice.vatNumber?.trim())) {
    return NextResponse.json(
      { error: "Per la fattura servono ragione sociale e partita IVA." },
      { status: 400 }
    );
  }

  const settings = await getPricingSettings();
  const shippingRules = toShippingRules(settings);
  const session = await getSession();
  const isReseller = session?.role === "RESELLER";

  const products = await prisma.product.findMany({ where: { id: { in: body.items.map((i) => i.productId) } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const problems: string[] = [];
  const validLines = body.items.flatMap((item) => {
    const product = byId.get(item.productId);
    if (!product || !product.published) {
      problems.push(`Un articolo del carrello non è più disponibile.`);
      return [];
    }
    if (isOutOfStock(product.stockQty)) {
      problems.push(`"${cleanProductName(product.name)}" è esaurito.`);
      return [];
    }
    const cap = maxOrderableQty(product.stockQty);
    if (item.quantity > cap) {
      problems.push(`Disponibili solo ${cap} pezzi di "${cleanProductName(product.name)}".`);
      return [];
    }
    return [{ product, quantity: item.quantity, packaging: item.packaging ?? ("SEALED" as const) }];
  });

  if (problems.length) {
    return NextResponse.json({ error: "Alcuni articoli non sono più disponibili come richiesto.", problems }, { status: 409 });
  }

  const discount = body.couponCode ? await validateDiscountCode(body.couponCode) : { ok: false as const };
  if (body.couponCode && !discount.ok) {
    return NextResponse.json({ error: discount.error ?? "Codice sconto non valido." }, { status: 400 });
  }

  const totals = computeCartTotals(
    validLines.map(({ product, quantity, packaging }) => ({ unitPriceCents: unitPriceCentsFor(product, isReseller, packaging), quantity })),
    shippingRules,
    discount.ok ? discount.percentOffBps : 0
  );

  const orderNumber = generateOrderNumber();

  // I prezzi del sito sono SEMPRE IVA inclusa: la fattura non aggiunge alcun supplemento,
  // riporta solo l'IVA già compresa nel totale (vedi extractVatCents).
  const invoiceRequested = body.invoice?.requested ?? false;
  const invoiceVatCents = extractVatCents(totals.totalCents, settings.invoiceVatRateBps);
  const grandTotalCents = totals.totalCents;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: session?.userId,
        guestEmail: session ? undefined : body.contact.email,
        status: "PENDING_PAYMENT",
        paymentMethod: "CARD",
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
        companyName: body.invoice?.companyName,
        vatNumber: body.invoice?.vatNumber,
        sdiCode: body.invoice?.sdiCode,
        customerNote: body.customerNote,
        items: {
          create: validLines.map(({ product, quantity, packaging }, i) => ({
            productId: product.id,
            nameSnapshot: cleanProductName(product.name),
            unitPriceCentsSnapshot: totals.lines[i].unitPriceCents,
            supplierCostCentsSnapshot: product.supplierCostCents,
            packagingSnapshot: packaging,
            quantity,
            lineTotalCents: totals.lines[i].lineTotalCents,
          })),
        },
        statusHistory: {
          create: [{ status: "PENDING_PAYMENT", note: "Ordine creato dal cliente.", changedBy: "system" }],
        },
      },
    });
    return created;
  });

  if (discount.ok && discount.code) {
    recordDiscountCodeUsage(discount.code).catch((err) => console.error("[checkout] conteggio utilizzi codice sconto fallito:", err));
  }

  // Il pagamento vero avviene su Stripe: l'ordine resta PENDING_PAYMENT finché il webhook
  // non conferma il pagamento (vedi /api/webhooks/stripe). Niente email di conferma qui:
  // partono solo a pagamento confermato, per non promettere un ordine non ancora pagato.
  const customerEmail = session?.email ?? body.contact.email;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Il pagamento online non è ancora configurato. Contatta l'assistenza per completare l'ordine." },
      { status: 503 }
    );
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: grandTotalCents,
            product_data: {
              name: `Ordine ${order.orderNumber} · FMF Cards`,
              description: validLines.map(({ product, quantity }) => `${quantity}× ${cleanProductName(product.name)}`).join(", "),
            },
          },
        },
      ],
      metadata: { orderId: order.id },
      success_url: `${SITE_URL}/ordine/${order.id}?pagamento=ok`,
      cancel_url: `${SITE_URL}/checkout?pagamento=annullato`,
    });

    if (!checkoutSession.url) throw new Error("Stripe non ha restituito un URL di checkout.");

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
