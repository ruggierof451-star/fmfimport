import { notFound } from "next/navigation";
import { CatalogPage, type CatalogSearchParams } from "@/components/catalog-page";
import { LIST_META } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const meta = LIST_META[category];
  if (!meta) return {};
  return { title: meta.title, description: meta.description || undefined };
}

export default async function CategoryRoute({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { category } = await params;
  if (!LIST_META[category]) notFound();
  const sp = await searchParams;
  return <CatalogPage listKey={category} searchParams={sp} />;
}
