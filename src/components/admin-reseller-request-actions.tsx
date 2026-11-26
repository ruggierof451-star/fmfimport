"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewResellerRequestAction } from "@/lib/reseller-actions";

export function AdminResellerRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function review(status: "APPROVED" | "REJECTED") {
    const note = status === "REJECTED" ? prompt("Motivo del rifiuto (opzionale):") ?? undefined : undefined;
    setBusy(true);
    await reviewResellerRequestAction({ id, status, note });
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
