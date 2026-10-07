import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getPricingSettings } from "@/lib/settings";
import { formatEuro } from "@/lib/pricing";

export const metadata = { title: "Centro assistenza" };

export default async function AssistenzaPage() {
  const settings = await getPricingSettings();
  const faqs: [string, string][] = [
    ["I prodotti sono originali?", "Sì. Vendiamo solo prodotti ufficiali e sigillati, acquistati da distribuzione autorizzata."],
    ["Devo registrarmi o avere la partita IVA?", "No. I prezzi sono visibili a tutti e puoi comprare come ospite. La fattura è disponibile se inserisci i dati aziendali al checkout."],
    [
      "Come funziona lo sconto quantità?",
      `Quando nel carrello metti più di ${settings.bulkThresholdQty} pezzi dello stesso articolo, il prezzo unitario scende automaticamente per tutti i pezzi di quell'articolo.`,
    ],
    [
      "Quanto costa la spedizione?",
      `È gratuita per ordini da ${formatEuro(settings.freeShippingThresholdCents)} in su. Sotto questa soglia il costo è indicato nel carrello prima del pagamento.`,
    ],
    ["Che differenza c'è tra giapponese, cinese e coreano?", "Sono tutte carte ufficiali. Cambiano la lingua, la composizione delle buste e spesso il prezzo. In ogni scheda trovi la lingua indicata chiaramente."],
    ["Posso restituire un prodotto?", "Sì, entro 7 giorni dalla consegna se il prodotto risulta danneggiato o mancante. Contattaci dal Centro assistenza con il numero d'ordine. Trovi i dettagli nella pagina Resi e recesso."],
  ];

  return (
    <>
      <Header activeKey="assistenza" />
      <main className="wrap page" style={{ gap: 28 }}>
        <div>
          <span className="eyebrow">Assistenza</span>
          <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500, marginTop: 6 }}>Come possiamo aiutarti?</h1>
        </div>
        <div className="two">
          <div className="a">
            <h2 style={{ fontSize: 22, fontWeight: 500 }}>Domande frequenti</h2>
            {faqs.map(([q, a]) => (
              <details className="faq" key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <div className="b" style={{ position: "static", display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="box">
              <h2>Scrivici</h2>
              <p className="muted" style={{ margin: 0 }}>
                Per lo stato di un ordine, resi o domande sui prodotti, scrivici indicando (se disponibile) il numero
                d&apos;ordine.
              </p>
              <a className="btn btn-dark" href="mailto:assistenza@fmfimport.it?subject=Richiesta%20assistenza">
                Apri la tua email
              </a>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Modalità test: l&apos;indirizzo email di assistenza è un segnaposto da sostituire prima della
                pubblicazione.
              </p>
            </div>
            <div className="box" style={{ gap: 8 }}>
              <h2>Altri contatti</h2>
              <p style={{ margin: 0 }}>
                Email: <span className="ph">[EMAIL]</span>
              </p>
              <p style={{ margin: 0 }}>
                WhatsApp: <span className="ph">[NUMERO]</span>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Orari: <span className="ph">[ORARI]</span>
              </p>
              <Link href="/negozianti" style={{ fontSize: 14 }}>
                Sei un negozio? Vai alle condizioni per rivenditori →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
