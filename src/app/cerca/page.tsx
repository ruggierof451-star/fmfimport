import { CatalogPage, type CatalogSearchParams } from "@/components/catalog-page";

// Pagina personale o di servizio: fuori da Google.
export const metadata = { title: "Risultati di ricerca", robots: { index: false, follow: false } };

export default async function SearchRoute({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const sp = await searchParams;
  return <CatalogPage listKey="cerca" searchParams={sp} />;
}
