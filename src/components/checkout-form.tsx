"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { ShipBar } from "@/components/cart-drawer";
import { formatEuro } from "@/lib/pricing";

type Errors = Record<string, string>;

export function CheckoutForm({ invoiceVatRateBps }: { invoiceVatRateBps: number }) {
  const { items, quote, clearCart } = useCart();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [sdiCode, setSdiCode] = useState("");
  const [payment, setPayment] = useState<"CARD" | "PAYPAL" | "BANK_TRANSFER">("CARD");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  if (items.length === 0) {
    return (
      <main className="wrap page">
        <div className="empty">
          <b>Il carrello è vuoto</b>
          <p>Aggiungi almeno un prodotto per procedere.</p>
          <Link className="btn btn-dark btn-sm" href="/">
            Vai al catalogo
          </Link>
        </div>
      </main>
    );
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Inserisci un'email valida.";
    if (phone.trim().length < 5) e.tel = "Inserisci un numero di telefono valido.";
    if (!firstName.trim()) e.nome = "Campo obbligatorio.";
    if (!lastName.trim()) e.cognome = "Campo obbligatorio.";
    if (!street.trim()) e.indirizzo = "Campo obbligatorio.";
    if (!/^\d{4,5}$/.test(postalCode.trim())) e.cap = "CAP non valido.";
    if (!city.trim()) e.citta = "Campo obbligatorio.";
    if (!province.trim()) e.prov = "Campo obbligatorio.";
    if (wantsInvoice) {
      if (!companyName.trim()) e.rs = "Campo obbligatorio per la fattura.";
      if (!vatNumber.trim()) e.piva = "Campo obbligatorio per la fattura.";
    }
    if (!terms) e.terms = "Devi accettare le condizioni di vendita per proseguire.";
    return e;
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          contact: { email, phone },
          shipping: { firstName, lastName, street, postalCode, city, province, country: "IT" },
          invoice: wantsInvoice ? { requested: true, companyName, vatNumber, sdiCode } : { requested: false },
          paymentMethod: payment,
          acceptedTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.problems ? data.problems.join(" ") : data.error ?? "Si è verificato un errore. Riprova.");
        setSubmitting(false);
        return;
      }
      clearCart();
      router.push(`/ordine/${data.orderId}`);
    } catch {
      setServerError("Impossibile completare l'ordine. Controlla la connessione e riprova.");
      setSubmitting(false);
    }
  }

  const totals = quote?.totals;
  // Solo anteprima: il server ricalcola tutto da zero al momento della conferma.
  const invoiceVatPreviewCents = wantsInvoice && totals ? Math.round((totals.totalCents * invoiceVatRateBps) / 10000) : 0;
  const grandTotalPreviewCents = totals ? totals.totalCents + invoiceVatPreviewCents : 0;

  return (
    <main className="wrap page" style={{ gap: 24 }}>
      <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500 }}>Checkout</h1>
      <form className="two" onSubmit={handleSubmit} noValidate>
        <div className="a">
          {serverError ? (
            <div className="alert err" role="alert">
              {serverError}
            </div>
          ) : null}
          {Object.keys(errors).length ? (
            <div className="alert err" role="alert">
              Controlla i campi evidenziati in rosso.
            </div>
          ) : null}

          <section className="box">
            <div className="step">
              <i>1</i>
              <h2>Contatti</h2>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Acquisti come ospite.{" "}
              <Link href="/account">Hai un account? Accedi</Link>
            </p>
            <div className="form">
              <Field label="Email" full error={errors.email} htmlFor="email">
                <input id="email" className={`in ${errors.email ? "bad" : ""}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
              <Field label="Telefono per il corriere" full error={errors.tel} htmlFor="tel">
                <input id="tel" className={`in ${errors.tel ? "bad" : ""}`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </Field>
            </div>
          </section>

          <section className="box">
            <div className="step">
              <i>2</i>
              <h2>Indirizzo di spedizione</h2>
            </div>
            <div className="form">
              <Field label="Nome" error={errors.nome} htmlFor="nome">
                <input id="nome" className={`in ${errors.nome ? "bad" : ""}`} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
              </Field>
              <Field label="Cognome" error={errors.cognome} htmlFor="cognome">
                <input id="cognome" className={`in ${errors.cognome ? "bad" : ""}`} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
              </Field>
              <Field label="Indirizzo e numero civico" full error={errors.indirizzo} htmlFor="indirizzo">
                <input id="indirizzo" className={`in ${errors.indirizzo ? "bad" : ""}`} value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="street-address" />
              </Field>
              <Field label="CAP" error={errors.cap} htmlFor="cap">
                <input id="cap" className={`in ${errors.cap ? "bad" : ""}`} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} autoComplete="postal-code" />
              </Field>
              <Field label="Città" error={errors.citta} htmlFor="citta">
                <input id="citta" className={`in ${errors.citta ? "bad" : ""}`} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
              </Field>
              <Field label="Provincia" error={errors.prov} htmlFor="prov">
                <input id="prov" className={`in ${errors.prov ? "bad" : ""}`} value={province} onChange={(e) => setProvince(e.target.value)} autoComplete="address-level1" />
              </Field>
              <label className="fl" htmlFor="paese">
                Paese
                <select className="in" id="paese" disabled>
                  <option>Italia</option>
                </select>
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={wantsInvoice} onChange={(e) => setWantsInvoice(e.target.checked)} />
              Voglio la fattura (azienda o partita IVA)
            </label>
            {wantsInvoice ? (
              <div className="alert info" style={{ marginTop: -4 }}>
                I prezzi del sito sono IVA esclusa. Richiedendo la fattura con partita IVA viene applicato un
                supplemento del {(invoiceVatRateBps / 100).toLocaleString("it-IT")}% sul totale dell&apos;ordine.
              </div>
            ) : null}
            {wantsInvoice ? (
              <div className="form">
                <Field label="Ragione sociale" full error={errors.rs} htmlFor="rs">
                  <input id="rs" className={`in ${errors.rs ? "bad" : ""}`} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </Field>
                <Field label="Partita IVA" error={errors.piva} htmlFor="piva">
                  <input id="piva" className={`in ${errors.piva ? "bad" : ""}`} value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                </Field>
                <Field label="Codice SDI o PEC" htmlFor="sdi">
                  <input id="sdi" className="in" value={sdiCode} onChange={(e) => setSdiCode(e.target.value)} />
                </Field>
              </div>
            ) : null}
          </section>

          <section className="box">
            <div className="step">
              <i>3</i>
              <h2>Pagamento</h2>
            </div>
            {(
              [
                ["CARD", "Carta di credito o debito", "Visa, Mastercard, Amex. I dati della carta si inseriscono nel modulo sicuro del circuito di pagamento."],
                ["PAYPAL", "PayPal", "Verrai indirizzato a PayPal per completare il pagamento."],
                ["BANK_TRANSFER", "Bonifico bancario", "L'ordine viene spedito alla ricezione del bonifico."],
              ] as const
            ).map(([value, label, desc]) => (
              <label className="opt" key={value}>
                <input type="radio" name="pay" checked={payment === value} onChange={() => setPayment(value)} />
                <span>
                  <b>{label}</b>
                  <br />
                  <span className="muted" style={{ fontSize: 14 }}>
                    {desc}
                  </span>
                </span>
              </label>
            ))}
            <div className="alert info">
              Modalità test: il gateway di pagamento reale non è ancora collegato. Nessun addebito verrà effettuato;
              l&apos;ordine resta in attesa di pagamento finché non viene configurato.
            </div>
          </section>

          <label className="check">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            Ho letto e accetto le <Link href="/condizioni">condizioni di vendita</Link> e l&apos;
            <Link href="/privacy">informativa privacy</Link>.
          </label>
          {errors.terms ? (
            <span className="err" style={{ fontSize: 13, fontWeight: 600 }}>
              {errors.terms}
            </span>
          ) : null}
        </div>

        <div className="b">
          <div className="sum">
            <b style={{ fontSize: 17 }}>Riepilogo</b>
            {quote?.lines.map((line) => (
              <div className="r" key={line.productId} style={{ fontSize: 14 }}>
                <span style={{ minWidth: 0 }}>
                  {line.quantity} × {line.name}
                </span>
                <span>{formatEuro(line.lineTotalCents)}</span>
              </div>
            ))}
            {totals ? (
              <>
                <ShipBar
                  missing={totals.freeShippingRemainderCents}
                  pct={Math.min(100, (totals.subtotalCents / Math.max(1, totals.subtotalCents + totals.freeShippingRemainderCents)) * 100)}
                />
                {totals.bulkDiscountCents > 0 ? (
                  <div className="r ok">
                    <span>Sconto quantità</span>
                    <span>−{formatEuro(totals.bulkDiscountCents)}</span>
                  </div>
                ) : null}
                <div className="r">
                  <span>Spedizione</span>
                  <span>{totals.shippingCents ? formatEuro(totals.shippingCents) : <b className="ok">Gratis</b>}</span>
                </div>
                {wantsInvoice ? (
                  <div className="r">
                    <span>IVA fattura ({(invoiceVatRateBps / 100).toLocaleString("it-IT")}%)</span>
                    <span>{formatEuro(invoiceVatPreviewCents)}</span>
                  </div>
                ) : null}
                <div className="r t">
                  <span>Totale</span>
                  <span>{formatEuro(grandTotalPreviewCents)}</span>
                </div>
                <span className="muted" style={{ fontSize: 13 }}>
                  Prezzi IVA esclusa.{wantsInvoice ? " Totale con supplemento IVA fattura." : ""}
                </span>
                <button type="submit" className="btn btn-gold" disabled={submitting}>
                  {submitting ? "Invio in corso…" : `Conferma ordine · ${formatEuro(grandTotalPreviewCents)}`}
                </button>
                <span className="muted" style={{ fontSize: 12, textAlign: "center" }}>
                  Modalità test: nessun addebito reale.
                </span>
              </>
            ) : null}
          </div>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  full,
  error,
  htmlFor,
  children,
}: {
  label: string;
  full?: boolean;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`fl ${full ? "full" : ""}`} htmlFor={htmlFor}>
      {label}
      {children}
      {error ? <span className="e">{error}</span> : null}
    </label>
  );
}
