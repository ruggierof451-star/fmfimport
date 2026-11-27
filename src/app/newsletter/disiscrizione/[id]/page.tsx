import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsletterUnsubscribeButton } from "@/components/newsletter-unsubscribe-button";

export const metadata = { title: "Disiscrizione newsletter", robots: { index: false, follow: false } };

/**
 * Pagina del link "Annulla l'iscrizione" delle email di marketing. Anche qui la
 * disiscrizione avviene con un clic sul pulsante e non al caricamento, perché alcuni
 * programmi di posta aprono da soli i link per controllarli.
 */
export default async function NewsletterUnsubscribePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Header />
      <main className="wrap page">
        <div className="box" style={{ maxWidth: 480, marginInline: "auto", textAlign: "center", alignItems: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Non vuoi più ricevere le nostre email?</h1>
          <p className="muted" style={{ margin: 0 }}>
            Non riceverai più offerte e novità da FMF Cards. Le email sui tuoi ordini (conferme e spedizioni) continueranno
            ad arrivare.
          </p>
          <NewsletterUnsubscribeButton sendId={id} />
        </div>
      </main>
      <Footer />
    </>
  );
}
