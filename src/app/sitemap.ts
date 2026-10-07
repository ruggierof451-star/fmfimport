import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { LIST_META } from "@/lib/catalog";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });

  const staticRoutes = [
    "",
    ...Object.keys(LIST_META),
    "spedizioni",
    "resi",
    "privacy",
    "condizioni",
    "cookie",
    "chi-siamo",
    "come-funziona",
    "contatti",
    "assistenza",
    "negozianti",
  ].map((path) => ({
    url: `${SITE_URL}/${path}`,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const productRoutes = products.map((p) => ({
    url: `${SITE_URL}/prodotto/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
