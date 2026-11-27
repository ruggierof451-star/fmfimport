import { notFound } from "next/navigation";
import { CatalogPage, type CatalogSearchParams } from "@/components/catalog-page";
import { LIST_META } from "@/lib/catalog";
import { breadcrumbJsonLd, DEFAULT_OG_IMAGE } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const meta = LIST_META[category];
  if (!meta) return {};
  // Canonical sempre sulla categoria "pulita": filtri, ordinamento e pagine della stessa
  // lista non creano duplicati in Google.
  return {
    title: meta.title,
    description: meta.description || undefined,
    alternates: { canonical: `/${category}` },
    openGraph: {
      url: `/${category}`,
      title: `${meta.title} · FMF Cards`,
      description: meta.description || undefined,
      images: [DEFAULT_OG_IMAGE],
    },
  };
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
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: LIST_META[category].title, path: `/${category}` },
        ])}
      />
      <CatalogPage listKey={category} searchParams={sp} />
    </>
  );
}
