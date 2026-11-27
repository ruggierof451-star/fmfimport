"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncMarketingContactsAction } from "@/lib/marketing-actions";

/** Allinea su Resend i contatti con consenso non ancora sincronizzati (a blocchi). */
export function AdminMarketingSyncButton({ pending }: { pending: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button
        type="button"
        className="btn btn-line btn-sm"
        disabled={busy || pending === 0}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          const res = await syncMarketingContactsAction().catch(() => ({ ok: false, error: "Sincronizzazione non riuscita." }) as Awaited<ReturnType<typeof syncMarketingContactsAction>>);
          setBusy(false);
          setMessage(
            res.ok
              ? { ok: true, text: `${res.synced ?? 0} contatti sincronizzati${res.remaining ? `, ne restano ${res.remaining}: premi di nuovo` : ""}.` }
              : { ok: false, text: res.error ?? "Sincronizzazione non riuscita." }
          );
          router.refresh();
        }}
      >
        {busy ? "Sincronizzazione…" : pending ? `Sincronizza ${pending} contatti con Resend` : "Contatti allineati con Resend"}
      </button>
      {message ? <span className={message.ok ? "ok" : "e"} style={{ fontSize: 13 }}>{message.text}</span> : null}
    </div>
  );
}
