"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDiscountCodeAction } from "@/lib/discount-admin-actions";

export function AdminNewDiscountForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("5");
  const [maxUses, setMaxUses] = useState("");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await createDiscountCodeAction({
      code: code.trim(),
      percentOff: parseFloat(percentOff.replace(",", ".")),
      maxUses: maxUses.trim() === "" ? null : parseInt(maxUses, 10),
      maxUsesPerUser: maxUsesPerUser.trim() === "" ? null : parseInt(maxUsesPerUser, 10),
      expiresAt: expiresAt.trim() === "" ? null : expiresAt,
    });
    setSaving(false);
    if (result.ok) {
      setMessage("Codice creato.");
      setCode("");
      setPercentOff("5");
      setMaxUses("");
      setMaxUsesPerUser("");
      setExpiresAt("");
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore durante la creazione.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
      {message ? <div className={`alert ${message === "Codice creato." ? "ok" : "err"}`}>{message}</div> : null}
      <label className="fl">
        Codice (es. FMFCARDS)
        <input className="in" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="NUOVOCODICE" />
      </label>
      <label className="fl">
        Sconto (%)
        <input className="in" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} placeholder="es. 5" />
      </label>
      <label className="fl">
        Utilizzi massimi totali (vuoto = illimitati)
        <input className="in" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="es. 100" />
      </label>
      <label className="fl">
        Utilizzi massimi per profilo (vuoto = illimitati)
        <input className="in" value={maxUsesPerUser} onChange={(e) => setMaxUsesPerUser(e.target.value)} placeholder="es. 1" />
      </label>
      <label className="fl">
        Scadenza (vuoto = nessuna)
        <input className="in" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Creazione…" : "Crea codice sconto"}
      </button>
    </form>
  );
}
