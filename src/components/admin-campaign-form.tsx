"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateMarketingCampaignAction,
  deleteMarketingCampaignAction,
  sendTestMarketingEmailAction,
  sendMarketingCampaignAction,
} from "@/lib/marketing-actions";

export interface CampaignData {
  id: string;
  subject: string;
  bodyHtml: string;
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED";
  recipientCount: number | null;
  failedCount: number | null;
  sentAt: string | null;
}

export function AdminCampaignForm({ campaign, subscriberCount }: { campaign: CampaignData; subscriberCount: number }) {
  const router = useRouter();
  const [subject, setSubject] = useState(campaign.subject);
  const [bodyHtml, setBodyHtml] = useState(campaign.bodyHtml);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const isDraft = campaign.status === "DRAFT";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await updateMarketingCampaignAction({ id: campaign.id, subject: subject.trim(), bodyHtml });
    setSaving(false);
    setMessage(result.ok ? "Salvato." : result.error ?? "Errore durante il salvataggio.");
    if (result.ok) router.refresh();
  }

  async function handleTest() {
    setTestSending(true);
    setMessage("");
    const result = await sendTestMarketingEmailAction({ id: campaign.id });
    setTestSending(false);
    setMessage(result.ok ? "Email di prova inviata al tuo indirizzo admin." : result.error ?? "Invio di prova fallito.");
  }

  async function handleSend() {
    if (!confirm(`Inviare questa campagna a ${subscriberCount} iscritti? Non si può annullare dopo l'invio.`)) return;
    setSending(true);
    setMessage("");
    const result = await sendMarketingCampaignAction({ id: campaign.id });
    setSending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error ?? "Invio non riuscito.");
    }
  }

  async function handleDelete() {
    if (!confirm("Eliminare questa bozza?")) return;
    setDeleting(true);
    const result = await deleteMarketingCampaignAction({ id: campaign.id });
    if (result.ok) {
      router.push("/admin/marketing");
    } else {
      setDeleting(false);
      setMessage(result.error ?? "Errore durante l'eliminazione.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
      {message ? <div className={`alert ${message === "Salvato." || message.includes("inviata") ? "ok" : "err"}`}>{message}</div> : null}

      {!isDraft ? (
        <div className="alert info">
          Campagna {campaign.status === "SENT" ? "inviata" : campaign.status === "FAILED" ? "con invio fallito" : "in invio"}
          {campaign.sentAt ? ` il ${new Date(campaign.sentAt).toLocaleString("it-IT")}` : ""} ·{" "}
          {campaign.recipientCount ?? 0} destinatari raggiunti
          {campaign.failedCount ? `, ${campaign.failedCount} falliti` : ""}. Una campagna inviata non si può più
          modificare: crea una nuova campagna per rimandare lo stesso contenuto.
        </div>
      ) : null}

      <form onSubmit={handleSave} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="fl">
          Oggetto email
          <input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!isDraft} />
        </label>
        <label className="fl">
          Contenuto (HTML consentito)
          <textarea className="in" rows={14} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} disabled={!isDraft} />
        </label>
        {isDraft ? (
          <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </button>
        ) : null}
      </form>

      {isDraft ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <b>Invio</b>
          <p className="muted" style={{ margin: 0 }}>
            {subscriberCount} iscritti alle email di marketing al momento.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-line btn-sm" onClick={handleTest} disabled={testSending}>
              {testSending ? "Invio…" : "Invia email di prova a me"}
            </button>
            <button type="button" className="btn btn-gold btn-sm" onClick={handleSend} disabled={sending || subscriberCount === 0}>
              {sending ? "Invio in corso…" : `Invia a ${subscriberCount} iscritti`}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminazione…" : "Elimina bozza"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
