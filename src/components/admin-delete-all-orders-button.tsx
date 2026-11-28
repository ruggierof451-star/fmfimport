"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllOrdersAction } from "@/lib/admin-actions";

/**
 * Elimina TUTTI gli ordini. Operazione pericolosa e irreversibile: chiede di scrivere a
 * mano una parola di conferma prima di procedere. Da usare per svuotare gli ordini di prova.
 */
export function AdminDeleteAllOrdersButton() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    const typed = window.prompt('Questo elimina TUTTI gli ordini, per sempre. Per confermare scrivi: ELIMINA TUTTO');
    if (typed !== "ELIMINA TUTTO") return;
    setSaving(true);
    const res = await deleteAllOrdersAction();
    setSaving(false);
    if (!res.ok) {
      alert(res.error ?? "Errore durante l'eliminazione.");
      return;
    }
    alert(`Eliminati ${res.deleted ?? 0} ordini.`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className="btn btn-sm"
      style={{ background: "transparent", border: "1px solid #B3261E", color: "#B3261E" }}
    >
      {saving ? "Eliminazione…" : "Elimina tutti gli ordini"}
    </button>
  );
}
