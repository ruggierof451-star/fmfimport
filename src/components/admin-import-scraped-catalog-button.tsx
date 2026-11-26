"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importScrapedCatalogAction } from "@/lib/admin-actions";

export function AdminImportScrapedCatalogButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClick() {
    if (!confirm("Importa il catalogo Pokémon/One Piece scaricato da torecaimport.com? Crea solo i prodotti nuovi (senza prezzo, non pubblicati), salta quelli già presenti.")) return;
    setRunning(true);
    setMessage("");
    const result = await importScrapedCatalogAction();
    setRunning(false);
    if (result.ok) {
      setMessage(`Importati ${result.created} prodotti nuovi (${result.skipped} già presenti, saltati).`);
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore durante l'importazione.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <button type="button" className="btn btn-line btn-sm" onClick={handleClick} disabled={running}>
        {running ? "Importazione…" : "Importa catalogo da torecaimport.com"}
      </button>
      {message ? <span className="muted" style={{ fontSize: 12 }}>{message}</span> : null}
    </div>
  );
}
