import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeCartTotals, unitPriceCentsFor } from "@/lib/pricing";
import { getPricingSettings, toShippingRules } from "@/lib/settings";
import { cleanProductName } from "@/lib/product-art";
import { isOutOfStock, maxOrderableQty } from "@/lib/stock";
import { ensureCutoutImage } from "@/lib/image-cutout";
import { getSession } from "@/lib/auth";
import { validateDiscountCode } from "@/lib/discounts";

/**
 * Unica fonte di verità per i prezzi del carrello. Il client manda solo {productId, quantity}
 * e, se presente, il codice sconto digitato: ogni prezzo, sconto, spedizione e disponibilità
 * viene ricalcolato qui dal database corrente. Non fidarsi MAI di un prezzo o di uno sconto
 * inviato dal browser (vale anche al checkout).
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
    .max(200),
  couponCode: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const { items, couponCode } = parsed.data;
  const settings = await getPricingSettings();
  const shipping = toShippingRules(settings);
  const session = await getSession();
  const isReseller = session?.role === "RESELLER";
  const discount = couponCode
    ? await validateDiscountCode(couponCode, { userId: session?.userId, email: session?.email })
    : { ok: false as const };

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
    return [{ product, quantity, packaging: item.packaging ?? "SEALED" }];
  });

  const totals = computeCartTotals(
    lines.map(({ product, quantity, packaging }) => ({ unitPriceCents: unitPriceCentsFor(product, isReseller, packaging), quantity })),
    shipping,
    discount.ok ? discount.percentOffBps : 0
  );

  const lineDetails = await Promise.all(
    lines.map(async ({ product, quantity, packaging }, i) => ({
      productId: product.id,
      slug: product.slug,
      name: cleanProductName(product.name),
      type: product.type,
      language: product.language,
      imageUrl: product.imageUrl ? (await ensureCutoutImage(product.imageUrl, product.slug))?.url ?? product.imageUrl : null,
      quantity,
      packaging,
      unitPriceCents: totals.lines[i].unitPriceCents,
      isResellerPrice: isReseller && product.resellerPriceCents != null,
      lineTotalCents: totals.lines[i].lineTotalCents,
    }))
  );

  return NextResponse.json({
    lines: lineDetails,
    totals,
    removed,
    adjusted,
    coupon:
      couponCode && couponCode.trim()
        ? discount.ok
          ? { code: discount.code, percentOffBps: discount.percentOffBps }
          : { error: discount.error ?? "Codice sconto non valido." }
        : null,
  });
}
