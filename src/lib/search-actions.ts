"use server";

import { prisma } from "@/lib/prisma";
import { unitPriceCentsFor, formatEuro } from "@/lib/pricing";
import { cleanProductName } from "@/lib/product-art";
import { GAME_LABEL, LANG_LABEL } from "@/lib/catalog";
import { getSession } from "@/lib/auth";

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

  const session = await getSession();
  const isReseller = session?.role === "RESELLER";

  return products.map((p) => ({
    slug: p.slug,
    name: cleanProductName(p.name),
    type: p.type,
    priceLabel: `${GAME_LABEL[p.game]} · ${LANG_LABEL[p.language]} · ${p.type} · ${formatEuro(unitPriceCentsFor(p, isReseller))}`,
  }));
}
