import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { UnsubscribeButton } from "@/components/unsubscribe-button";

// Pagina personale o di servizio: fuori da Google.
export const metadata = { title: "Disiscrizione email", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  return (
    <>
      <Header />
      <main className="wrap page">
        <div className="box" style={{ maxWidth: 480, marginInline: "auto", textAlign: "center", alignItems: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Disiscriviti dalle email di marketing</h1>
          <p className="muted" style={{ margin: 0 }}>
            Continuerai comunque a ricevere le email legate ai tuoi ordini (conferme, spedizioni) — solo le
            offerte e le novità via email si fermano.
          </p>
          <UnsubscribeButton userId={userId} />
        </div>
      </main>
      <Footer />
    </>
  );
}
