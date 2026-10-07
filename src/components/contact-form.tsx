"use client";

import { useState } from "react";
import { submitContactMessageAction } from "@/lib/contact-actions";

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const result = await submitContactMessageAction({ email, orderNumber, message });
    setSending(false);
    if (result.ok) {
      setSent(true);
      setEmail("");
      setOrderNumber("");
      setMessage("");
    } else {
      setError(result.error ?? "Errore durante l'invio. Riprova.");
    }
  }

  if (sent) {
    return (
      <div className="alert ok">
        Richiesta inviata. Ti risponderemo via email dal martedì al venerdì, dalle 8:00 alle 19:00.
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
        La tua email *
        <input
          className="in"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@esempio.it"
        />
      </label>
      <label className="fl">
        Numero d&apos;ordine (se disponibile)
        <input
          className="in"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="FMF-20261007-5599"
        />
      </label>
      <label className="fl">
        Messaggio *
        <textarea
          className="in"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Descrivi la tua richiesta..."
        />
      </label>
      <button type="submit" className="btn btn-dark" disabled={sending}>
        {sending ? "Invio in corso…" : "Invia richiesta"}
      </button>
    </form>
  );
}
