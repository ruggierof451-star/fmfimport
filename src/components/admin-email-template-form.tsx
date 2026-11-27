"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveEmailTemplateAction,
  resetEmailTemplateAction,
  sendEmailTemplatePreviewAction,
} from "@/lib/email-template-actions";
import type { TemplatePlaceholder } from "@/lib/email-templates";

export function AdminEmailTemplateForm({
  templateKey,
  initialSubject,
  initialBody,
  isCustom,
  placeholders,
}: {
  templateKey: string;
  initialSubject: string;
  initialBody: string;
  isCustom: boolean;
  placeholders: TemplatePlaceholder[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  const isOk = message === "Salvato." || message.includes("inviata") || message.includes("ripristinato");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await saveEmailTemplateAction({ key: templateKey, subject, bodyHtml });
    setSaving(false);
    setMessage(result.ok ? "Salvato." : result.error ?? "Errore durante il salvataggio.");
    if (result.ok) router.refresh();
  }

  async function handleTest() {
    setTesting(true);
    setMessage("");
    const result = await sendEmailTemplatePreviewAction({ key: templateKey, subject, bodyHtml });
    setTesting(false);
    setMessage(result.ok ? "Email di prova inviata al tuo indirizzo admin." : result.error ?? "Invio di prova non riuscito.");
  }

  async function handleReset() {
    if (!confirm("Tornare al testo predefinito? La tua versione personalizzata viene persa.")) return;
    setResetting(true);
    setMessage("");
    const result = await resetEmailTemplateAction({ key: templateKey });
    setResetting(false);
    if (result.ok) {
      setMessage("Testo predefinito ripristinato.");
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore durante il ripristino.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      {message ? <div className={`alert ${isOk ? "ok" : "err"}`}>{message}</div> : null}

      {placeholders.length ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 14 }}>Segnaposto disponibili</b>
          <span className="muted" style={{ fontSize: 13 }}>
            Scrivili nel testo (o nell&apos;oggetto) e vengono sostituiti all&apos;invio con i dati reali.
          </span>
          <table className="admin">
            <tbody>
              {placeholders.map((p) => (
                <tr key={p.name}>
                  <td className="mono" style={{ whiteSpace: "nowrap" }}>{`{{${p.name}}}`}</td>
                  <td>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <form onSubmit={handleSave} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="fl">
          Oggetto
          <input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="fl">
          Testo (HTML consentito)
          <textarea className="in" rows={16} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
          <span className="muted" style={{ fontSize: 13 }}>
            Viene inserito dentro il modello grafico di FMF Cards (logo in alto e piè di pagina): scrivi solo il
            contenuto centrale.
          </span>
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-dark" type="submit" disabled={saving}>
            {saving ? "Salvataggio…" : "Salva"}
          </button>
          <button type="button" className="btn btn-line btn-sm" onClick={handleTest} disabled={testing}>
            {testing ? "Invio…" : "Invia prova a me"}
          </button>
          {isCustom ? (
            <button type="button" className="btn btn-line btn-sm" onClick={handleReset} disabled={resetting}>
              {resetting ? "Ripristino…" : "Ripristina testo predefinito"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
