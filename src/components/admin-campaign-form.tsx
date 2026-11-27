"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateMarketingCampaignAction,
  deleteMarketingCampaignAction,
  sendTestMarketingEmailAction,
  sendMarketingCampaignAction,
  cancelMarketingCampaignAction,
  reopenMarketingCampaignAction,
} from "@/lib/marketing-actions";
import type { SegmentOption } from "@/components/admin-new-campaign-form";

export interface CampaignData {
  id: string;
  subject: string;
  previewText: string | null;
  bodyHtml: string;
  segmentKey: string;
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED" | "SCHEDULED" | "CANCELED";
  recipientCount: number | null;
  failedCount: number | null;
  sentAt: string | null;
  scheduledAt: string | null;
}

const fmt = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });

/** Valore per <input type="datetime-local"> nell'ora locale del browser. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminCampaignForm({ campaign, segments }: { campaign: CampaignData; segments: SegmentOption[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState(campaign.subject);
  const [previewText, setPreviewText] = useState(campaign.previewText ?? "");
  const [segmentKey, setSegmentKey] = useState(campaign.segmentKey);
  const [bodyHtml, setBodyHtml] = useState(campaign.bodyHtml);
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3_600_000)));
  const [busy, setBusy] = useState<"" | "save" | "test" | "send" | "cancel" | "delete" | "reopen">("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const isDraft = campaign.status === "DRAFT";
  const segment = segments.find((s) => s.key === (isDraft ? segmentKey : campaign.segmentKey));
  const dirty =
    subject !== campaign.subject || previewText !== (campaign.previewText ?? "") || segmentKey !== campaign.segmentKey || bodyHtml !== campaign.bodyHtml;

  async function run(kind: typeof busy, fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, after?: () => void) {
    setBusy(kind);
    setMessage(null);
    const res = await fn().catch(() => ({ ok: false, error: "Operazione non riuscita." }));
    setBusy("");
    setMessage(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? "Operazione non riuscita." });
    if (res.ok) (after ?? (() => router.refresh()))();
  }

  function save() {
    return run(
      "save",
      () =>
        updateMarketingCampaignAction({
          id: campaign.id,
          subject: subject.trim(),
          previewText: previewText.trim() || null,
          bodyHtml,
          segmentKey: segmentKey as "all",
        }),
      "Salvato."
    );
  }

  function send() {
    if (dirty) {
      setMessage({ ok: false, text: "Hai modifiche non salvate: salva prima di inviare." });
      return;
    }
    const scheduledAt = mode === "later" ? new Date(when).toISOString() : null;
    const target = `${segment?.label ?? "gruppo scelto"} (${segment?.count ?? 0})`;
    const question =
      mode === "later"
        ? `Programmare l'invio per il ${fmt(scheduledAt!)} a: ${target}? Potrai annullarlo fino all'invio.`
        : `Inviare adesso a: ${target}? Dopo l'invio non si può più fermare.`;
    if (!confirm(question)) return;
    return run("send", () => sendMarketingCampaignAction({ id: campaign.id, scheduledAt }), mode === "later" ? "Campagna programmata." : "Campagna inviata.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
      {message ? <div className={`alert ${message.ok ? "ok" : "err"}`}>{message.text}</div> : null}

      {campaign.status === "SENT" ? (
        <div className="alert info">
          Inviata{campaign.sentAt ? ` il ${fmt(campaign.sentAt)}` : ""} a «{segment?.label ?? campaign.segmentKey}»
          {campaign.recipientCount != null ? ` · circa ${campaign.recipientCount} destinatari` : ""}. Una campagna inviata non si
          può modificare: creane una nuova per rimandare lo stesso contenuto.
        </div>
      ) : null}
      {campaign.status === "FAILED" ? (
        <div className="alert err">Invio fallito{campaign.sentAt ? ` il ${fmt(campaign.sentAt)}` : ""}.</div>
      ) : null}
      {campaign.status === "SCHEDULED" ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b>Programmata{campaign.scheduledAt ? ` per il ${fmt(campaign.scheduledAt)}` : ""}</b>
          <span className="muted">
            Destinatari: {segment?.label ?? campaign.segmentKey}
            {campaign.recipientCount != null ? ` (circa ${campaign.recipientCount})` : ""}.
          </span>
          <button
            type="button"
            className="btn btn-sm"
            style={{ alignSelf: "flex-start", background: "transparent", border: "1px solid #B33", color: "#E55" }}
            disabled={!!busy}
            onClick={() => confirm("Annullare l'invio programmato?") && run("cancel", () => cancelMarketingCampaignAction({ id: campaign.id }), "Invio annullato.")}
          >
            {busy === "cancel" ? "Annullamento…" : "Annulla invio programmato"}
          </button>
        </div>
      ) : null}
      {campaign.status === "CANCELED" ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b>Invio annullato</b>
          <span className="muted">Puoi riportarla in bozza per modificarla e inviarla di nuovo, oppure eliminarla.</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-line btn-sm" disabled={!!busy} onClick={() => run("reopen", () => reopenMarketingCampaignAction({ id: campaign.id }), "Riportata in bozza.")}>
              Riporta in bozza
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
              disabled={!!busy}
              onClick={() =>
                confirm("Eliminare questa campagna?") &&
                run("delete", () => deleteMarketingCampaignAction({ id: campaign.id }), "Eliminata.", () => router.push("/admin/marketing"))
              }
            >
              Elimina
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="admin-card"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <label className="fl">
          Oggetto email
          <input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!isDraft} />
        </label>
        <label className="fl">
          Anteprima (facoltativa)
          <input className="in" value={previewText} onChange={(e) => setPreviewText(e.target.value)} disabled={!isDraft} />
        </label>
        <label className="fl">
          Destinatari
          <select className="in" value={segmentKey} onChange={(e) => setSegmentKey(e.target.value)} disabled={!isDraft}>
            {segments.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
        </label>
        <label className="fl">
          Contenuto (HTML consentito)
          <textarea className="in" rows={14} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} disabled={!isDraft} />
        </label>
        {isDraft ? (
          <button className="btn btn-dark" type="submit" disabled={!!busy || !dirty} style={{ alignSelf: "flex-start" }}>
            {busy === "save" ? "Salvataggio…" : dirty ? "Salva modifiche" : "Salvato"}
          </button>
        ) : null}
      </form>

      {isDraft ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <b>Invio</b>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
            <label className="check">
              <input type="radio" name="mode" checked={mode === "now"} onChange={() => setMode("now")} />
              Invia subito
            </label>
            <label className="check">
              <input type="radio" name="mode" checked={mode === "later"} onChange={() => setMode("later")} />
              Programma
            </label>
          </div>
          {mode === "later" ? (
            <label className="fl" style={{ maxWidth: 260 }}>
              Data e ora di invio
              <input className="in" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={!!busy || dirty}
              onClick={() => run("test", () => sendTestMarketingEmailAction({ id: campaign.id }), "Email di prova inviata al tuo indirizzo admin.")}
            >
              {busy === "test" ? "Invio…" : "Invia email di prova a me"}
            </button>
            <button type="button" className="btn btn-gold btn-sm" onClick={send} disabled={!!busy || (segment?.count ?? 0) === 0}>
              {busy === "send"
                ? "Invio in corso…"
                : mode === "later"
                  ? `Programma per ${segment?.count ?? 0} iscritti`
                  : `Invia a ${segment?.count ?? 0} iscritti`}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
              disabled={!!busy}
              onClick={() =>
                confirm("Eliminare questa bozza?") &&
                run("delete", () => deleteMarketingCampaignAction({ id: campaign.id }), "Eliminata.", () => router.push("/admin/marketing"))
              }
            >
              {busy === "delete" ? "Eliminazione…" : "Elimina bozza"}
            </button>
          </div>
          {dirty ? <span className="muted" style={{ fontSize: 13 }}>Salva le modifiche per mandarti la prova o inviare.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
