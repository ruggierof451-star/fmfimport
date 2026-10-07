"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markContactMessageReadAction } from "@/lib/admin-actions";
import type { ContactMessage } from "@/generated/prisma";

export function AdminMessageRow({ message }: { message: ContactMessage }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggleRead() {
    setSaving(true);
    await markContactMessageReadAction({ id: message.id, read: !message.read });
    setSaving(false);
    router.refresh();
  }

  return (
    <div
      className="admin-card"
      style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: message.read ? undefined : "3px solid var(--gold)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <b>{message.email}</b>
          {message.orderNumber ? <span className="muted"> · ordine {message.orderNumber}</span> : null}
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {message.createdAt.toLocaleString("it-IT")}
        </span>
      </div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.message}</p>
      <div>
        <button type="button" className="btn btn-line btn-sm" onClick={toggleRead} disabled={saving}>
          {saving ? "…" : message.read ? "Segna come da leggere" : "Segna come letto"}
        </button>
      </div>
    </div>
  );
}
