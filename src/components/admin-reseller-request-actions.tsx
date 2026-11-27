"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewResellerRequestAction } from "@/lib/reseller-actions";

export function AdminResellerRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState("");

  async function review(status: "APPROVED" | "REJECTED") {
    const note = status === "REJECTED" ? prompt("Motivo del rifiuto (opzionale):") ?? undefined : undefined;
    setBusy(true);
    setWarning("");
    const result = await reviewResellerRequestAction({ id, status, note });
    setBusy(false);
    if (result.warning) setWarning(result.warning);
    else if (!result.ok) setWarning(result.error ?? "Operazione non riuscita.");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 260 }}>
      {warning ? (
        <div className="alert info" style={{ fontSize: 12, fontWeight: 400, width: "100%" }}>
          {warning}
        </div>
      ) : null}
      <button type="button" className="btn btn-sm" style={{ background: "var(--gold)", color: "#000" }} disabled={busy} onClick={() => review("APPROVED")}>
        {busy ? "…" : "Approva"}
      </button>
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
        disabled={busy}
        onClick={() => review("REJECTED")}
      >
        {busy ? "…" : "Rifiuta"}
      </button>
    </div>
  );
}
