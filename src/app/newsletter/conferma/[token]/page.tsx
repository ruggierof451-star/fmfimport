import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsletterConfirmButton } from "@/components/newsletter-confirm-button";

// Pagina di servizio: fuori da Google.
export const metadata = { title: "Conferma iscrizione newsletter", robots: { index: false, follow: false } };

/**
 * La conferma avviene con un clic sul pulsante e non al semplice caricamento della pagina:
 * alcuni programmi di posta aprono in automatico i link delle email per controllarli e
 * altrimenti confermerebbero l'iscrizione al posto della persona.
 */
export default async function NewsletterConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <Header />
      <main className="wrap page">
        <div className="box" style={{ maxWidth: 480, marginInline: "auto", textAlign: "center", alignItems: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Conferma l&apos;iscrizione alla newsletter</h1>
          <p className="muted" style={{ margin: 0 }}>
            Riceverai nuovi arrivi, preordini e offerte di FMF Cards. Puoi disiscriverti in qualsiasi momento dal link
            in fondo a ogni email.
          </p>
          <NewsletterConfirmButton token={token} />
        </div>
      </main>
      <Footer />
    </>
  );
}
