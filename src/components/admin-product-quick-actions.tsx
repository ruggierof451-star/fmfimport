"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveProductAction, unarchiveProductAction, deleteProductAction, restoreProductAction } from "@/lib/admin-actions";

export function AdminProductQuickActions({
  id,
  archived,
  deleted,
}: {
  id: string;
  archived: boolean;
  deleted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    await action();
    setBusy(false);
    router.refresh();
  }

  if (deleted) {
    return (
      <button type="button" className="btn btn-line btn-sm" disabled={busy} onClick={() => run(() => restoreProductAction({ id }))}>
        {busy ? "…" : "Ripristina"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {archived ? (
        <button type="button" className="btn btn-line btn-sm" disabled={busy} onClick={() => run(() => unarchiveProductAction({ id }))}>
          {busy ? "…" : "Riattiva"}
        </button>
      ) : (
        <button type="button" className="btn btn-line btn-sm" disabled={busy} onClick={() => run(() => archiveProductAction({ id }))}>
          {busy ? "…" : "Archivia"}
        </button>
      )}
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
        disabled={busy}
        onClick={() => {
          if (!confirm("Eliminare questo prodotto? Potrai ripristinarlo dalla sezione Eliminati.")) return;
          run(() => deleteProductAction({ id }));
        }}
      >
        {busy ? "…" : "Elimina"}
      </button>
    </div>
  );
}
