"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDiscountCodeAction, deleteDiscountCodeAction } from "@/lib/discount-admin-actions";

export interface DiscountRow {
  id: string;
  code: string;
  percentOff: string;
  maxUses: string;
  maxUsesPerUser: string;
  expiresAt: string;
  active: boolean;
  usedCount: number;
}

export function AdminDiscountEditForm({ discount }: { discount: DiscountRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [percentOff, setPercentOff] = useState(discount.percentOff);
  const [maxUses, setMaxUses] = useState(discount.maxUses);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(discount.maxUsesPerUser);
  const [expiresAt, setExpiresAt] = useState(discount.expiresAt);
  const [active, setActive] = useState(discount.active);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await updateDiscountCodeAction({
      id: discount.id,
      percentOff: parseFloat(percentOff.replace(",", ".")),
      maxUses: maxUses.trim() === "" ? null : parseInt(maxUses, 10),
      maxUsesPerUser: maxUsesPerUser.trim() === "" ? null : parseInt(maxUsesPerUser, 10),
      expiresAt: expiresAt.trim() === "" ? null : expiresAt,
      active,
    });
    setSaving(false);
    if (result.ok) {
      setMessage("Salvato.");
      setOpen(false);
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore durante il salvataggio.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare il codice ${discount.code}? Chi ce l'ha non potrà più usarlo.`)) return;
    setSaving(true);
    const result = await deleteDiscountCodeAction({ id: discount.id });
    setSaving(false);
    if (result.ok) router.refresh();
    else setMessage(result.error ?? "Errore durante l'eliminazione.");
  }

  if (!open) {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(true)}>
          Modifica
        </button>
        {message ? <span className={message === "Salvato." ? "ok" : "err"} style={{ fontSize: 12 }}>{message}</span> : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 240 }}>
      {message ? <div className={`alert ${message === "Salvato." ? "ok" : "err"}`} style={{ fontSize: 12 }}>{message}</div> : null}
      <label className="fl" style={{ fontSize: 12 }}>
        Sconto (%)
        <input className="in" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
      </label>
      <label className="fl" style={{ fontSize: 12 }}>
        Utilizzi massimi totali (vuoto = illimitati)
        <input className="in" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder={`già usato ${discount.usedCount}×`} />
      </label>
      <label className="fl" style={{ fontSize: 12 }}>
        Utilizzi massimi per profilo
        <input className="in" value={maxUsesPerUser} onChange={(e) => setMaxUsesPerUser(e.target.value)} placeholder="vuoto = illimitati" />
      </label>
      <label className="fl" style={{ fontSize: 12 }}>
        Scadenza
        <input className="in" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </label>
      <label className="check" style={{ fontSize: 13 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Attivo
      </label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="btn btn-dark btn-sm" type="submit" disabled={saving}>
          {saving ? "Salvataggio…" : "Salva"}
        </button>
        <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(false)} disabled={saving}>
          Annulla
        </button>
        <button
          type="button"
          className="btn btn-sm"
          style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
          onClick={handleDelete}
          disabled={saving}
        >
          Elimina
        </button>
      </div>
    </form>
  );
}
