import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Chi siamo",
  description:
    "FMF Cards: prodotti sigillati Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball, originali e con prezzi chiari per tutti.",
  alternates: { canonical: "/chi-siamo" },
  openGraph: { url: "/chi-siamo", title: "Chi siamo · FMF Cards" },
};
export default function Page() {
  return <InfoPageLayout slug="chi-siamo" />;
}
