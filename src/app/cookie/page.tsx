import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Cookie",
  description:
    "Informativa sui cookie utilizzati dal sito FMF Cards e su come gestire le preferenze.",
  alternates: { canonical: "/cookie" },
  openGraph: { url: "/cookie", title: "Cookie · FMF Cards" },
};
export default function Page() {
  return <InfoPageLayout slug="cookie" />;
}
