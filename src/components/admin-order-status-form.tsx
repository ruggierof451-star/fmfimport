"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatusAction } from "@/lib/admin-actions";

const STATUSES = [
  ["PENDING_PAYMENT", "In attesa di pagamento"],
  ["PAYMENT_CONFIRMED", "Pagamento confermato"],
  ["AVAILABILITY_CHECK", "Verifica disponibilità"],
  ["TO_PROCURE", "Da approvvigionare"],
  ["PREPARING", "In preparazione"],
  ["SHIPPED", "Spedito"],
  ["DELIVERED", "Consegnato"],
  ["CANCELLED", "Annullato"],
  ["REFUNDED", "Rimborsato"],
] as const;

export function AdminOrderStatusForm({
  orderId,
  currentStatus,
  trackingCarrier,
  trackingNumber,
}: {
  orderId: string;
  currentStatus: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [carrier, setCarrier] = useState(trackingCarrier ?? "");
  const [number, setNumber] = useState(trackingNumber ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateOrderStatusAction({
      orderId,
      status: status as (typeof STATUSES)[number][0],
      note: note || undefined,
      trackingCarrier: carrier || undefined,
      trackingNumber: number || undefined,
    });
    setSaving(false);
    setMessage(result.ok ? "Stato aggiornato." : result.error ?? "Errore.");
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
      {message ? <div className={`alert ${message === "Stato aggiornato." ? "ok" : "err"}`}>{message}</div> : null}
      <label className="fl">
        Stato ordine
        <select className="in" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="fl">
        Corriere
        <input className="in" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="es. BRT, GLS, SDA…" />
      </label>
      <label className="fl">
        Numero tracking
        <input className="in" value={number} onChange={(e) => setNumber(e.target.value)} />
      </label>
      <label className="fl">
        Nota interna (facoltativa)
        <textarea className="in" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Salvataggio…" : "Aggiorna ordine"}
      </button>
    </form>
  );
}
