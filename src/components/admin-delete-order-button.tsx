"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrderAction } from "@/lib/admin-actions";

/**
 * Elimina definitivamente un ordine. Utile per ripulire gli ordini di prova. Richiede
 * una doppia conferma perché l'operazione è irreversibile.
 */
export function AdminDeleteOrderButton({
  orderId,
  orderNumber,
  redirectTo,
}: {
  orderId: string;
  orderNumber: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    if (!confirm(`Eliminare DEFINITIVAMENTE l'ordine ${orderNumber}? L'operazione non è reversibile.`)) return;
    setSaving(true);
    const res = await deleteOrderAction({ orderId });
    setSaving(false);
    if (!res.ok) {
      alert(res.error ?? "Errore durante l'eliminazione.");
      return;
    }
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className="btn btn-sm"
      style={{ background: "#B3261E", border: "1px solid #B3261E", color: "#fff" }}
    >
      {saving ? "Eliminazione…" : "Elimina ordine"}
    </button>
  );
}
