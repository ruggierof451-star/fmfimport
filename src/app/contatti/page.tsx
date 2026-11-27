import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Contatti",
  description:
    "Contatta FMF Cards per informazioni su prodotti, ordini e disponibilità.",
  alternates: { canonical: "/contatti" },
  openGraph: { url: "/contatti", title: "Contatti · FMF Cards" },
};
export default function Page() {
  return <InfoPageLayout slug="contatti" />;
}
