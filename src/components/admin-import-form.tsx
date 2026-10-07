"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setResult({ ok: false, message: "Scegli un file CSV o XLSX." });
      return;
    }
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? "Errore durante l'importazione." });
      } else {
        setResult({
          ok: true,
          message: `${data.totalRows} righe lette · ${data.updated} prodotti aggiornati · ${data.needsReview} da rivedere manualmente.`,
        });
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "Caricamento fallito. Controlla la connessione e riprova." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {result ? <div className={`alert ${result.ok ? "ok" : "err"}`}>{result.message}</div> : null}
      <label className="fl">
        File listino fornitore (.csv o .xlsx)
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="in" style={{ padding: 8 }} />
      </label>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Colonne riconosciute (qualunque di questi nomi, anche in italiano): <b>name</b>/nome, <b>code</b>/codice,{" "}
        <b>cost_net</b>/costo_netto oppure <b>cost</b>/costo (se non specifichi netto si assume IVA inclusa),{" "}
        <b>stock</b>/scorta.
      </p>
      <button className="btn btn-dark btn-sm" type="submit" disabled={uploading} style={{ alignSelf: "flex-start" }}>
        {uploading ? "Importazione in corso…" : "Importa file"}
      </button>
    </form>
  );
}
