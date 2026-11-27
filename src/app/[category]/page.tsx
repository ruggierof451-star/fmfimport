import { notFound } from "next/navigation";
import { CatalogPage, type CatalogSearchParams } from "@/components/catalog-page";
import { LIST_META } from "@/lib/catalog";
import { categorySeo, categoryParentCrumb } from "@/lib/seo";
import { breadcrumbJsonLd, DEFAULT_OG_IMAGE } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const meta = LIST_META[category];
  if (!meta) return {};
  const seo = categorySeo(category);
  // Canonical sempre sulla categoria "pulita": filtri, ordinamento e pagine della stessa
  // lista non creano duplicati in Google.
  return {
    title: { absolute: seo?.title ?? `${meta.title} - FMF Cards` },
    description: seo?.description ?? meta.description ?? undefined,
    alternates: { canonical: `/${category}` },
    openGraph: {
      url: `/${category}`,
      title: seo?.title ?? `${meta.title} · FMF Cards`,
      description: seo?.description ?? meta.description ?? undefined,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE.url] },
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
          ...categoryParentCrumb(category),
          { name: LIST_META[category].title, path: `/${category}` },
        ])}
      />
      <CatalogPage listKey={category} searchParams={sp} />
    </>
  );
}
