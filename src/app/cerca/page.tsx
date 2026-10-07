import { CatalogPage, type CatalogSearchParams } from "@/components/catalog-page";

export const metadata = { title: "Risultati di ricerca" };

export default async function SearchRoute({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const sp = await searchParams;
  return <CatalogPage listKey="cerca" searchParams={sp} />;
}
