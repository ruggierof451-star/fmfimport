"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetAutomationAction, saveAutomationAction, testAutomationAction } from "@/lib/marketing-actions";

interface Automation {
  key: "welcome" | "abandoned_order";
  enabled: boolean;
  subject: string;
  bodyHtml: string;
  delayHours: number;
}

export function AdminAutomationForm({
  automation,
  title,
  description,
  stats,
}: {
  automation: Automation;
  title: string;
  description: string;
  stats: { sent: number; opened: number; clicked: number; queued: number };
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(automation.enabled);
  const [subject, setSubject] = useState(automation.subject);
  const [bodyHtml, setBodyHtml] = useState(automation.bodyHtml);
  const [delayHours, setDelayHours] = useState(automation.delayHours);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = enabled !== automation.enabled || subject !== automation.subject || bodyHtml !== automation.bodyHtml || delayHours !== automation.delayHours;

  async function run(kind: string, fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setBusy(kind);
    setMsg(null);
    const r = await fn().catch(() => ({ ok: false, error: "Operazione non riuscita." }));
    setBusy("");
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Operazione non riuscita." });
    if (r.ok) router.refresh();
  }

  return (
    <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <b style={{ fontSize: 17 }}>{title}</b>
        <span className="badge-status">{automation.enabled ? "Attiva" : "Disattivata"}</span>
      </div>
      <span className="muted" style={{ fontSize: 13 }}>{description}</span>
      <span className="muted" style={{ fontSize: 13 }}>
        Inviate: {stats.sent} · aperte: {stats.opened} · con clic: {stats.clicked}
        {stats.queued ? ` · in coda: ${stats.queued}` : ""}
      </span>
      {msg ? <div className={`alert ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}
      <label className="check" style={{ fontSize: 14 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Attiva
      </label>
      {automation.key === "abandoned_order" ? (
        <label className="fl" style={{ maxWidth: 260 }}>
          Ore di attesa dopo l&apos;ordine non pagato
          <input className="in" type="number" min={1} max={72} value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value) || 1)} />
        </label>
      ) : null}
      <label className="fl">
        Oggetto (puoi usare {"{{nome}}"})
        <input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="fl">
        HTML dell&apos;email
        <textarea className="in" rows={12} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }} />
      </label>
      <span className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
        Segnaposto: <code>{"{{nome}}"}</code> (o <code>{"{{nome|amico}}"}</code> con testo di riserva), <code>{"{{email}}"}</code>, <code>{"{{disiscrizione}}"}</code>
        {automation.key === "abandoned_order" ? (
          <>
            , <code>{"{{numero_ordine}}"}</code>, <code>{"{{prodotti}}"}</code> (elenco dei prodotti con link)
          </>
        ) : null}
        . Puoi incollare anche l&apos;HTML completo di Claude Design.
      </span>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-dark btn-sm"
          disabled={!!busy || !dirty}
          onClick={() => run("save", () => saveAutomationAction({ key: automation.key, enabled, subject, bodyHtml, delayHours }), "Salvato.")}
        >
          {busy === "save" ? "Salvataggio…" : dirty ? "Salva" : "Salvato"}
        </button>
        <button type="button" className="btn btn-line btn-sm" disabled={!!busy || dirty} onClick={() => run("test", () => testAutomationAction({ key: automation.key }), "Prova inviata al tuo indirizzo admin.")}>
          {busy === "test" ? "Invio…" : "Invia prova a me"}
        </button>
        <button
          type="button"
          className="btn btn-line btn-sm"
          disabled={!!busy}
          onClick={() => confirm("Ripristinare oggetto e testo predefiniti?") && run("reset", () => resetAutomationAction({ key: automation.key }), "Testo predefinito ripristinato.")}
        >
          Ripristina testo predefinito
        </button>
      </div>
      {dirty ? <span className="muted" style={{ fontSize: 13 }}>Salva per inviarti la prova.</span> : null}
    </div>
  );
}
