"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processMarketingQueueAction } from "@/lib/marketing-actions";

/** Fa partire subito il prossimo blocco della coda (sempre entro il limite giornaliero). */
export function AdminMarketingQueueButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <button
        type="button"
        className="btn btn-line btn-sm"
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const r = await processMarketingQueueAction().catch(() => ({ ok: false, error: "Invio non riuscito." }) as Awaited<ReturnType<typeof processMarketingQueueAction>>);
          setBusy(false);
          setMsg(r.ok ? { ok: true, text: `${r.sent ?? 0} email inviate.` } : { ok: false, text: r.error ?? "Invio non riuscito." });
          router.refresh();
        }}
      >
        {busy ? "Invio…" : "Invia ora il prossimo blocco"}
      </button>
      {msg ? <span style={{ fontSize: 13, color: msg.ok ? "#4CAF7A" : "#E55" }}>{msg.text}</span> : null}
    </div>
  );
}
