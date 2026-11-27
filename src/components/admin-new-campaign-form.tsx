"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMarketingCampaignAction } from "@/lib/marketing-actions";

export function AdminNewCampaignForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await createMarketingCampaignAction({ subject: subject.trim(), bodyHtml });
    setSaving(false);
    if (result.ok && result.id) {
      router.push(`/admin/marketing/${result.id}`);
    } else {
      setMessage(result.error ?? "Errore durante la creazione.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
      {message ? <div className="alert err">{message}</div> : null}
      <label className="fl">
        Oggetto email
        <input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="es. -15% su tutto il catalogo Pokémon" />
      </label>
      <label className="fl">
        Contenuto (HTML consentito)
        <textarea
          className="in"
          rows={12}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="<h1>Titolo</h1><p>Testo dell'offerta...</p>"
        />
        <span className="muted" style={{ fontSize: 13 }}>
          Viene inserito dentro il modello email di FMF Cards (logo, piè di pagina, link di disiscrizione): scrivi
          solo il contenuto centrale.
        </span>
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Creazione…" : "Crea bozza"}
      </button>
    </form>
  );
}
