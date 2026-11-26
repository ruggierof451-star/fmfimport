import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeCartTotals, extractVatCents } from "@/lib/pricing";
import { getPricingSettings, toShippingRules } from "@/lib/settings";
import { findVariant, lineDisplayName, lineIsOutOfStock, lineMaxQty, lineUnitPriceCents } from "@/lib/variants";
import { cleanProductName } from "@/lib/product-art";
import { getSession } from "@/lib/auth";
import { formatEuro } from "@/lib/pricing";
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from "@/lib/email";
import { validateDiscountCode, recordDiscountCodeUsage } from "@/lib/discounts";

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
  paymentMethod: z.enum(["CARD", "PAYPAL", "BANK_TRANSFER"]),
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

  const products = await prisma.product.findMany({
    where: { id: { in: body.items.map((i) => i.productId) } },
    include: { variants: true },
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

  const discount = body.couponCode ? await validateDiscountCode(body.couponCode) : { ok: false as const };
  if (body.couponCode && !discount.ok) {
    return NextResponse.json({ error: discount.error ?? "Codice sconto non valido." }, { status: 400 });
  }

  const totals = computeCartTotals(
    validLines.map(({ product, variant, quantity, packaging }) => ({
      unitPriceCents: lineUnitPriceCents(product, variant, isReseller, packaging),
      quantity,
    })),
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
        companyName: body.invoice?.companyName,
        vatNumber: body.invoice?.vatNumber,
        sdiCode: body.invoice?.sdiCode,
        customerNote: body.customerNote,
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
    return created;
  });

  if (discount.ok && discount.code) {
    recordDiscountCodeUsage(discount.code).catch((err) => console.error("[checkout] conteggio utilizzi codice sconto fallito:", err));
  }

  const customerEmail = session?.email ?? body.contact.email;
  sendOrderConfirmationEmail({
    to: customerEmail,
    orderNumber: order.orderNumber,
    totalFormatted: formatEuro(order.totalCents),
    items: validLines.map(({ displayName, quantity }, i) => ({
      name: displayName,
      quantity,
      lineTotalFormatted: formatEuro(totals.lines[i].lineTotalCents),
    })),
  }).catch((err) => console.error("[checkout] invio email conferma fallito:", err));

  sendAdminNewOrderNotification({
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
    paymentMethod: order.paymentMethod,
  });
}
