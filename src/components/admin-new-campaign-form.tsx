"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMarketingCampaignAction } from "@/lib/marketing-actions";

export interface SegmentOption {
  key: string;
  label: string;
  count: number;
}

export function AdminNewCampaignForm({ segments }: { segments: SegmentOption[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [segmentKey, setSegmentKey] = useState("all");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await createMarketingCampaignAction({
      subject: subject.trim(),
      previewText: previewText.trim() || null,
      bodyHtml,
      segmentKey: segmentKey as "all",
    });
    setSaving(false);
    if (result.ok && result.id) router.push(`/admin/marketing/${result.id}`);
    else setMessage(result.error ?? "Errore durante la creazione.");
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
      {message ? <div className="alert err">{message}</div> : null}
      <label className="fl">
        Oggetto email
        <input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="es. Nuovo set One Piece OP-12 disponibile" />
      </label>
      <label className="fl">
        Anteprima (facoltativa) — il testo grigio che si vede accanto all&apos;oggetto nella casella di posta
        <input className="in" value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="es. Booster box giapponesi in arrivo, preordina ora" />
      </label>
      <label className="fl">
        Destinatari
        <select className="in" value={segmentKey} onChange={(e) => setSegmentKey(e.target.value)}>
          {segments.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>
      </label>
      <label className="fl">
        HTML dell&apos;email
        <textarea
          className="in"
          rows={14}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="Incolla qui l'HTML preparato in Claude Design"
          style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}
        />
        <span className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Incolla l&apos;HTML completo preparato in Claude Design (con pulsanti, immagini e stile): viene inviato così com&apos;è. Se incolli
          solo un pezzo di contenuto, il sito lo inserisce nel modello grafico FMF Cards. Segnaposto utilizzabili:{" "}
          <code>{"{{nome}}"}</code> (nome del destinatario, se lo conosciamo; <code>{"{{nome|amico}}"}</code> usa &quot;amico&quot; quando manca), <code>{"{{email}}"}</code> e{" "}
          <code>{"{{disiscrizione}}"}</code> (link per disiscriversi: se non lo metti, il sito aggiunge in fondo un piè di pagina con il
          link). Le immagini devono avere un indirizzo pubblico (https://…).
        </span>
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Creazione…" : "Crea bozza"}
      </button>
    </form>
  );
}
