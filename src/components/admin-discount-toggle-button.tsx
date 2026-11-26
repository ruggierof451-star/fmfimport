"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleDiscountCodeAction, deleteDiscountCodeAction } from "@/lib/discount-admin-actions";

export function AdminDiscountToggleButton({ id, active, code }: { id: string; active: boolean; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await toggleDiscountCodeAction({ id, active: !active });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Eliminare il codice "${code}"? Non si potrà più usare, ma gli ordini già fatti restano invariati.`)) return;
    setBusy(true);
    await deleteDiscountCodeAction({ id });
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button type="button" className="btn btn-line btn-sm" disabled={busy} onClick={toggle}>
        {busy ? "…" : active ? "Disattiva" : "Riattiva"}
      </button>
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
        disabled={busy}
        onClick={remove}
      >
        Elimina
      </button>
    </div>
  );
}
