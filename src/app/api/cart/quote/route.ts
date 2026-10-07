import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeCartTotals } from "@/lib/pricing";
import { getPricingSettings, toPricingRules, toShippingRules } from "@/lib/settings";
import { cleanProductName } from "@/lib/product-art";
import { isOutOfStock, maxOrderableQty, stockLabel } from "@/lib/stock";

/**
 * Unica fonte di verità per i prezzi del carrello. Il client manda solo {productId, quantity}:
 * ogni prezzo, sconto quantità, spedizione e disponibilità viene ricalcolato qui dal database
 * corrente. Non fidarsi MAI di un prezzo inviato dal browser (vale anche al checkout).
 */
const bodySchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive().max(999) })).max(200),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const { items } = parsed.data;
  const settings = await getPricingSettings();
  const rules = toPricingRules(settings);
  const shipping = toShippingRules(settings);

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const removed: { productId: string; reason: "not_found" | "unpublished" }[] = [];
  const adjusted: { productId: string; requestedQty: number; availableQty: number }[] = [];

  const lines = items.flatMap((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      removed.push({ productId: item.productId, reason: "not_found" });
      return [];
    }
    if (!product.published) {
      removed.push({ productId: item.productId, reason: "unpublished" });
      return [];
    }
    if (isOutOfStock(product.stockQty)) {
      removed.push({ productId: item.productId, reason: "not_found" });
      return [];
    }
    const cap = maxOrderableQty(product.stockQty);
    const quantity = Math.min(item.quantity, cap);
    if (quantity < item.quantity) {
      adjusted.push({ productId: item.productId, requestedQty: item.quantity, availableQty: cap });
    }
    return [{ product, quantity }];
  });

  const totals = computeCartTotals(
    lines.map(({ product, quantity }) => ({
      product: {
        costCents: product.supplierCostCents ?? 0,
        costVatTreatment: product.costVatTreatment,
        vatRateBps: product.vatRateBps,
      },
      quantity,
    })),
    rules,
    shipping
  );

  const lineDetails = lines.map(({ product, quantity }, i) => ({
    productId: product.id,
    slug: product.slug,
    name: cleanProductName(product.name),
    type: product.type,
    language: product.language,
    imageUrl: product.imageUrl,
    quantity,
    unitPriceCents: totals.lines[i].unitPriceCents,
    standardUnitPriceCents: totals.lines[i].standardUnitPriceCents,
    bulkUnitPriceCents: totals.lines[i].bulkUnitPriceCents,
    lineTotalCents: totals.lines[i].lineTotalCents,
    isBulkPricing: totals.lines[i].isBulkPricing,
    isEstimatedCost: product.costIsEstimated,
    stockLabel: stockLabel(product.stockQty, product.isPreorder),
    maxOrderableQty: maxOrderableQty(product.stockQty),
  }));

  return NextResponse.json({
    lines: lineDetails,
    totals,
    bulkThresholdQty: rules.bulkThresholdQty,
    removed,
    adjusted,
    hasEstimatedPrices: lineDetails.some((l) => l.isEstimatedCost),
  });
}
