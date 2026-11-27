import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Resi e recesso",
  description:
    "Come restituire un prodotto acquistato su FMF Cards: diritto di recesso di 14 giorni e procedura di reso.",
  alternates: { canonical: "/resi" },
  openGraph: { url: "/resi", title: "Resi e recesso · FMF Cards" },
};
export default function Page() {
  return <InfoPageLayout slug="resi" />;
}
