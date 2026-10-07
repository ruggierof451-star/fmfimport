import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeCartTotals, extractVatCents } from "@/lib/pricing";
import { getPricingSettings, toPricingRules, toShippingRules } from "@/lib/settings";
import { isOutOfStock, maxOrderableQty } from "@/lib/stock";
import { cleanProductName } from "@/lib/product-art";
import { getSession } from "@/lib/auth";
import { formatEuro } from "@/lib/pricing";
import { sendOrderConfirmationEmail } from "@/lib/email";

/**
 * Crea un ordine. Il totale NON viene mai letto dal corpo della richiesta: viene
 * ricalcolato qui da zero a partire dai prodotti nel database, con le regole di
 * pricing correnti. Se un prodotto non è più disponibile o la quantità richiesta
 * supera lo stock reale, l'ordine viene rifiutato (niente vendite "fantasma").
 */
const bodySchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive().max(999) })).min(1),
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
  const rules = toPricingRules(settings);
  const shippingRules = toShippingRules(settings);

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
    return [{ product, quantity: item.quantity }];
  });

  if (problems.length) {
    return NextResponse.json({ error: "Alcuni articoli non sono più disponibili come richiesto.", problems }, { status: 409 });
  }

  const totals = computeCartTotals(
    validLines.map(({ product, quantity }) => ({
      product: { costCents: product.supplierCostCents ?? 0, costVatTreatment: product.costVatTreatment, vatRateBps: product.vatRateBps },
      quantity,
    })),
    rules,
    shippingRules
  );

  const session = await getSession();
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
        discountCents: totals.bulkDiscountCents,
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
          create: validLines.map(({ product, quantity }, i) => ({
            productId: product.id,
            nameSnapshot: cleanProductName(product.name),
            unitPriceCentsSnapshot: totals.lines[i].unitPriceCents,
            supplierCostCentsSnapshot: product.supplierCostCents,
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

  const customerEmail = session?.email ?? body.contact.email;
  sendOrderConfirmationEmail({
    to: customerEmail,
    orderNumber: order.orderNumber,
    totalFormatted: formatEuro(order.totalCents),
    items: validLines.map(({ product, quantity }, i) => ({
      name: cleanProductName(product.name),
      quantity,
      lineTotalFormatted: formatEuro(totals.lines[i].lineTotalCents),
    })),
  }).catch((err) => console.error("[checkout] invio email conferma fallito:", err));

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalCents: order.totalCents,
    invoiceVatCents: order.invoiceVatCents,
    paymentMethod: order.paymentMethod,
  });
}
