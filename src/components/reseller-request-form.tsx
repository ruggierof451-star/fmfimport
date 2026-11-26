"use client";

import { useState } from "react";
import { submitResellerRequestAction } from "@/lib/reseller-actions";

export function ResellerRequestForm() {
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [sdiCode, setSdiCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const result = await submitResellerRequestAction({ companyName, vatNumber, sdiCode, contactName, email, phone, message });
    setSending(false);
    if (result.ok) {
      setSent(true);
      setCompanyName("");
      setVatNumber("");
      setSdiCode("");
      setContactName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } else {
      setError(result.error ?? "Errore durante l'invio. Riprova.");
    }
  }

  if (sent) {
    return (
      <div className="alert ok">
        Richiesta inviata. Valutiamo i dati aziendali e ti rispondiamo via email: se approvata, ti attiviamo un
        listino dedicato da distributore.
        <div style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-line btn-sm" onClick={() => setSent(false)}>
            Invia un&apos;altra richiesta
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error ? <div className="alert err">{error}</div> : null}
      <label className="fl">
        Ragione sociale *
        <input className="in" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome dell'attività" />
      </label>
      <label className="fl">
        Partita IVA *
        <input className="in" required value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="IT12345678901" />
      </label>
      <label className="fl">
        Codice SDI (se disponibile)
        <input className="in" value={sdiCode} onChange={(e) => setSdiCode(e.target.value)} placeholder="es. XXXXXXX" />
      </label>
      <label className="fl">
        Referente *
        <input className="in" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome e cognome" />
      </label>
      <label className="fl">
        Email *
        <input className="in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@azienda.it" />
      </label>
      <label className="fl">
        Telefono
        <input className="in" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="es. 333 1234567" />
      </label>
      <label className="fl">
        Messaggio (volumi indicativi, tipo di attività, ecc.)
        <textarea className="in" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-dark" disabled={sending}>
        {sending ? "Invio in corso…" : "Invia richiesta"}
      </button>
    </form>
  );
}
