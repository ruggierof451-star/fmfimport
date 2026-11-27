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
  retryFailedSendsAction,
} from "@/lib/marketing-actions";
import type { SegmentOption } from "@/components/admin-new-campaign-form";

export interface CampaignData {
  id: string;
  subject: string;
  previewText: string | null;
  bodyHtml: string;
  segmentKey: string;
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED" | "SCHEDULED" | "CANCELED";
  sentAt: string | null;
  scheduledAt: string | null;
  failed: number;
}

const fmt = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });

/** Valore per <input type="datetime-local"> nell'ora locale del browser. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const dangerBtn = { background: "transparent", border: "1px solid #B33", color: "#E55" } as const;

export function AdminCampaignForm({ campaign, segments, perDay }: { campaign: CampaignData; segments: SegmentOption[]; perDay: number }) {
  const router = useRouter();
  const [subject, setSubject] = useState(campaign.subject);
  const [previewText, setPreviewText] = useState(campaign.previewText ?? "");
  const [segmentKey, setSegmentKey] = useState(campaign.segmentKey);
  const [bodyHtml, setBodyHtml] = useState(campaign.bodyHtml);
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3_600_000)));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const isDraft = campaign.status === "DRAFT";
  const segment = segments.find((s) => s.key === (isDraft ? segmentKey : campaign.segmentKey));
  const count = segment?.count ?? 0;
  const days = perDay > 0 ? Math.ceil(count / perDay) : 0;
  const dirty =
    subject !== campaign.subject || previewText !== (campaign.previewText ?? "") || segmentKey !== campaign.segmentKey || bodyHtml !== campaign.bodyHtml;

  async function run(kind: string, fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, after?: () => void) {
    setBusy(kind);
    setMessage(null);
    const res = await fn().catch(() => ({ ok: false, error: "Operazione non riuscita." }));
    setBusy("");
    setMessage(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? "Operazione non riuscita." });
    if (res.ok) (after ?? (() => router.refresh()))();
  }

  function send() {
    if (dirty) {
      setMessage({ ok: false, text: "Hai modifiche non salvate: salva prima di inviare." });
      return;
    }
    const scheduledAt = mode === "later" ? new Date(when).toISOString() : null;
    const target = `${segment?.label ?? "gruppo scelto"} (${count})`;
    const pace = days > 1 ? ` Con il limite giornaliero partirà a blocchi in circa ${days} giorni.` : "";
    const question =
      mode === "later"
        ? `Programmare l'invio per il ${fmt(scheduledAt!)} a: ${target}?${pace} Potrai annullarlo.`
        : `Inviare adesso a: ${target}?${pace}`;
    if (!confirm(question)) return;
    return run(
      "send",
      () => sendMarketingCampaignAction({ id: campaign.id, scheduledAt }),
      mode === "later" ? "Campagna programmata." : "Campagna avviata: il primo blocco è partito, il resto segue da solo."
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      {message ? <div className={`alert ${message.ok ? "ok" : "err"}`}>{message.text}</div> : null}

      {campaign.status === "SCHEDULED" || campaign.status === "SENDING" ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b>
            {campaign.status === "SCHEDULED"
              ? `Programmata${campaign.scheduledAt ? ` per il ${fmt(campaign.scheduledAt)}` : ""}`
              : "In invio: parte a blocchi entro il limite giornaliero"}
          </b>
          <span className="muted" style={{ fontSize: 13 }}>
            {campaign.status === "SCHEDULED"
              ? "Parte entro pochi minuti dall'orario scelto, appena il sito riceve visite (al più tardi alle 9 del mattino dopo)."
              : "Puoi fermarla: chi l'ha già ricevuta resta, gli altri non la riceveranno."}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            style={{ ...dangerBtn, alignSelf: "flex-start" }}
            disabled={!!busy}
            onClick={() =>
              confirm(campaign.status === "SCHEDULED" ? "Annullare l'invio programmato?" : "Fermare l'invio per chi non l'ha ancora ricevuta?") &&
              run("cancel", () => cancelMarketingCampaignAction({ id: campaign.id }), "Campagna annullata.")
            }
          >
            {busy === "cancel" ? "Annullamento…" : campaign.status === "SCHEDULED" ? "Annulla invio programmato" : "Ferma l'invio"}
          </button>
        </div>
      ) : null}

      {campaign.failed > 0 && (campaign.status === "SENT" || campaign.status === "SENDING") ? (
        <div className="admin-card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>{campaign.failed} invii non riusciti.</span>
          <button
            type="button"
            className="btn btn-line btn-sm"
            disabled={!!busy}
            onClick={() => run("retry", () => retryFailedSendsAction({ id: campaign.id }), "Invii falliti rimessi in coda.")}
          >
            {busy === "retry" ? "Invio…" : "Riprova gli invii falliti"}
          </button>
        </div>
      ) : null}

      {campaign.status === "CANCELED" ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b>Campagna annullata</b>
          <span className="muted" style={{ fontSize: 13 }}>
            Riportandola in bozza puoi modificarla e inviarla di nuovo: chi l&apos;ha già ricevuta non la riceverà una seconda volta.
          </span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-line btn-sm" disabled={!!busy} onClick={() => run("reopen", () => reopenMarketingCampaignAction({ id: campaign.id }), "Riportata in bozza.")}>
              Riporta in bozza
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={dangerBtn}
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
          void run(
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
        }}
        className="admin-card"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <label className="fl">
          Oggetto email (puoi usare {"{{nome}}"})
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
          HTML dell&apos;email
          <textarea
            className="in"
            rows={16}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            disabled={!isDraft}
            style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}
          />
        </label>
        {isDraft ? (
          <span className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Segnaposto: <code>{"{{nome}}"}</code> (o <code>{"{{nome|amico}}"}</code> con testo di riserva), <code>{"{{email}}"}</code>, <code>{"{{disiscrizione}}"}</code> (se manca, il sito
            aggiunge il piè di pagina con il link per disiscriversi). I link vengono tracciati in automatico per le statistiche.
          </span>
        ) : null}
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
          {days > 1 ? (
            <span className="muted" style={{ fontSize: 13 }}>
              {count} destinatari con al massimo {perDay} email di marketing al giorno: l&apos;invio si completa in circa {days} giorni.
            </span>
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
            <button type="button" className="btn btn-gold btn-sm" onClick={send} disabled={!!busy || count === 0}>
              {busy === "send" ? "Avvio…" : mode === "later" ? `Programma per ${count} iscritti` : `Invia a ${count} iscritti`}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={dangerBtn}
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
