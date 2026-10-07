"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBillingInfoAction } from "@/lib/account-actions";

export function BillingInfoForm({
  name,
  companyName,
  vatNumber,
  sdiCode,
}: {
  name: string;
  companyName: string;
  vatNumber: string;
  sdiCode: string;
}) {
  const router = useRouter();
  const [nameVal, setNameVal] = useState(name);
  const [company, setCompany] = useState(companyName);
  const [vat, setVat] = useState(vatNumber);
  const [sdi, setSdi] = useState(sdiCode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await updateBillingInfoAction({ name: nameVal, companyName: company, vatNumber: vat, sdiCode: sdi });
    setSaving(false);
    if (result.ok) {
      setMessage("Dati salvati.");
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore durante il salvataggio.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="box" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2>Dati e fatturazione</h2>
      {message ? <div className={`alert ${message === "Dati salvati." ? "ok" : "err"}`}>{message}</div> : null}
      <label className="fl">
        Nome
        <input className="in" value={nameVal} onChange={(e) => setNameVal(e.target.value)} />
      </label>
      <label className="fl">
        Ragione sociale (facoltativa)
        <input className="in" value={company} onChange={(e) => setCompany(e.target.value)} />
      </label>
      <label className="fl">
        Partita IVA (facoltativa)
        <input className="in" value={vat} onChange={(e) => setVat(e.target.value)} />
      </label>
      <label className="fl">
        Codice SDI o PEC (facoltativo)
        <input className="in" value={sdi} onChange={(e) => setSdi(e.target.value)} />
      </label>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Questi dati vengono proposti automaticamente al checkout quando richiedi la fattura.
      </p>
      <button className="btn btn-dark btn-sm" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
