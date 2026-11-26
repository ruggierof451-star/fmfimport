"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllProductsAction } from "@/lib/admin-actions";

// Deve coincidere con DELETE_ALL_PRODUCTS_CONFIRM in src/lib/admin-actions.ts.
const CONFIRM_PHRASE = "ELIMINA TUTTO";

/**
 * Svuota il catalogo in un colpo solo (eliminazione "soft", recuperabile da
 * "Eliminati"). Pensato per il passaggio dai prodotti di prova a quelli reali:
 * chiede di digitare una frase di conferma prima di procedere.
 */
export function AdminDeleteAllProducts({ total }: { total: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (total === 0 && !msg) return null;

  async function handleDelete() {
    setBusy(true);
    setMsg(null);
    const res = await deleteAllProductsAction({ confirm: text });
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.error ?? "Operazione non riuscita." });
      return;
    }
    setMsg({ kind: "ok", text: `${res.count ?? 0} prodotti eliminati. Li trovi nella sezione "Eliminati" se servisse ripristinarne qualcuno.` });
    setOpen(false);
    setText("");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignSelf: "flex-start", maxWidth: 560 }}>
      {msg ? <div className={`alert ${msg.kind}`}>{msg.text}</div> : null}
      {!open ? (
        total > 0 ? (
          <button type="button" className="btn btn-line btn-sm" style={{ alignSelf: "flex-start", color: "#8C1D17", borderColor: "#E3B4B0" }} onClick={() => setOpen(true)}>
            Elimina tutti i prodotti ({total})
          </button>
        ) : null
      ) : (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: "#E3B4B0" }}>
          <b>Eliminare tutti i {total} prodotti del catalogo?</b>
          <span className="muted" style={{ fontSize: 14 }}>
            Spariscono subito dal sito (anche archiviati ed esauriti). Restano nel database per lo storico ordini e si possono
            ripristinare uno per uno dalla sezione &quot;Eliminati&quot;. Per confermare scrivi <b>{CONFIRM_PHRASE}</b>.
          </span>
          <input className="in" value={text} onChange={(e) => setText(e.target.value)} placeholder={CONFIRM_PHRASE} autoComplete="off" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: "#8C1D17", color: "#fff" }}
              disabled={busy || text.trim() !== CONFIRM_PHRASE}
              onClick={handleDelete}
            >
              {busy ? "Eliminazione…" : "Elimina tutto"}
            </button>
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setText("");
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
