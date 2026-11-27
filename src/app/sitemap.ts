import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { LIST_META } from "@/lib/catalog";
import { absoluteUrl, PUBLIC_INFO_PATHS } from "@/lib/site";

// Generata a ogni richiesta: prodotti nuovi, modificati o tolti dalla vendita si
// riflettono subito, senza aspettare un nuovo deploy.
export const dynamic = "force-dynamic";

/**
 * Sitemap sul solo dominio ufficiale (https://www.fmfcards.com): homepage, categorie,
 * pagine informative e prodotti effettivamente in vendita. Carrello, checkout, account,
 * ordini, ricerca, admin e API non sono mai inclusi.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: {
      published: true,
      archived: false,
      deletedAt: null,
      priceCents: { not: null },
      // esauriti esclusi, a meno che abbiano varianti ancora acquistabili
      OR: [{ stockQty: null }, { stockQty: { gt: 0 } }, { variants: { some: {} } }],
    },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();
  const home: MetadataRoute.Sitemap = [{ url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 }];

  const categories: MetadataRoute.Sitemap = Object.keys(LIST_META).map((key) => ({
    url: absoluteUrl(`/${key}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const info: MetadataRoute.Sitemap = PUBLIC_INFO_PATHS.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: absoluteUrl(`/prodotto/${encodeURIComponent(p.slug)}`),
    lastModified: p.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...home, ...categories, ...info, ...productRoutes];
}
