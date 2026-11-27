import { DEFAULT_OG_IMAGE } from "@/lib/site";
import { InfoPageLayout } from "@/components/info-page-layout";

export const metadata = {
  title: "Come funziona",
  description:
    "Come acquistare su FMF Cards: scegli il prodotto, paga in sicurezza e ricevi l'ordine a casa.",
  alternates: { canonical: "/come-funziona" },
  openGraph: { url: "/come-funziona", title: "Come funziona · FMF Cards", images: [DEFAULT_OG_IMAGE] },
};
export default function Page() {
  return <InfoPageLayout slug="come-funziona" />;
}
