import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ResellerRequestForm } from "@/components/reseller-request-form";

export const metadata = { title: "Lavora con noi" };

export default function LavoraConNoiPage() {
  return (
    <>
      <Header activeKey="lavora-con-noi" />
      <main className="wrap page" style={{ gap: 32 }}>
        <div>
          <span className="eyebrow">Negozi · distribuzione · rivenditori</span>
          <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500, marginTop: 6 }}>Lavora con noi</h1>
          <p className="muted" style={{ maxWidth: 680 }}>
            Hai un negozio, un&apos;attività di live selling o rivendi prodotti sigillati con partita IVA? Registrati
            per richiedere l&apos;accesso a un listino dedicato da distributore.
          </p>
        </div>

        <section className="box">
          <h2>Come funziona</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Compila il modulo con i dati della tua attività (ragione sociale, partita IVA, referente).</li>
            <li>Valutiamo manualmente ogni richiesta: ti rispondiamo via email.</li>
            <li>Se approvata, attiviamo per il tuo account un listino con condizioni dedicate da distributore.</li>
            <li>Nessun obbligo di acquisto minimo: le condizioni si discutono caso per caso.</li>
          </ul>
        </section>

        <section className="box">
          <h2>Richiedi l&apos;accesso</h2>
          <ResellerRequestForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
