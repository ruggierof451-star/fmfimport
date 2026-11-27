import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Spedizioni",
  description:
    "Tempi, costi e modalità di spedizione degli ordini FMF Cards in Italia, con spedizione gratuita sopra soglia.",
  alternates: { canonical: "/spedizioni" },
  openGraph: { url: "/spedizioni", title: "Spedizioni · FMF Cards" },
};
export default function Page() {
  return <InfoPageLayout slug="spedizioni" />;
}
