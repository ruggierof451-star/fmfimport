"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatusAction } from "@/lib/admin-actions";

export function AdminCancelOrderButton({ orderId, orderNumber, status }: { orderId: string; orderNumber: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (status === "CANCELLED" || status === "DELIVERED" || status === "REFUNDED") return null;

  async function handleClick() {
    if (!confirm(`Annullare l'ordine ${orderNumber}? Il cliente non verrà avvisato automaticamente.`)) return;
    setSaving(true);
    await updateOrderStatusAction({ orderId, status: "CANCELLED", note: "Annullato dall'admin." });
    setSaving(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className="btn btn-sm"
      style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
    >
      {saving ? "Annullamento…" : "Annulla ordine"}
    </button>
  );
}
