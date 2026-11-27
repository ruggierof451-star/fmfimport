import { DEFAULT_OG_IMAGE } from "@/lib/site";
import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Condizioni di vendita",
  description:
    "Condizioni generali di vendita dei prodotti FMF Cards: ordini, pagamenti, spedizioni e garanzie.",
  alternates: { canonical: "/condizioni" },
  openGraph: { url: "/condizioni", title: "Condizioni di vendita · FMF Cards", images: [DEFAULT_OG_IMAGE] },
};
export default function Page() {
  return <InfoPageLayout slug="condizioni" />;
}
