import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Privacy",
  description:
    "Informativa sul trattamento dei dati personali dei clienti di FMF Cards.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy", title: "Privacy · FMF Cards" },
};
export default function Page() {
  return <InfoPageLayout slug="privacy" />;
}
