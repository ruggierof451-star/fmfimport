"use server";

import { prisma } from "@/lib/prisma";
import { standardPriceCents, formatEuro, type PricingRules } from "@/lib/pricing";
import { getPricingSettings, toPricingRules } from "@/lib/settings";
import { cleanProductName } from "@/lib/product-art";
import { GAME_LABEL, LANG_LABEL } from "@/lib/catalog";

export interface SearchSuggestion {
  slug: string;
  name: string;
  type: string;
  priceLabel: string;
}

export async function searchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 6);

  const products = await prisma.product.findMany({
    where: {
      published: true,
      AND: terms.map((term) => ({
        OR: [{ name: { contains: term } }, { setCode: { contains: term } }, { type: { contains: term } }],
      })),
    },
    take: 6,
  });

  const settings = await getPricingSettings();
  const rules: PricingRules = toPricingRules(settings);

  return products.map((p) => ({
    slug: p.slug,
    name: cleanProductName(p.name),
    type: p.type,
    priceLabel: `${GAME_LABEL[p.game]} · ${LANG_LABEL[p.language]} · ${p.type} · ${formatEuro(
      standardPriceCents(
        { costCents: p.supplierCostCents ?? 0, costVatTreatment: p.costVatTreatment, vatRateBps: p.vatRateBps },
        rules
      )
    )}`,
  }));
}
