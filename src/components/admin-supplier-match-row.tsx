"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dismissSupplierLinkAction, manualMatchSupplierLinkAction } from "@/lib/admin-actions";

export function AdminSupplierMatchRow({
  linkId,
  supplierName,
  supplierCode,
  products,
}: {
  linkId: string;
  supplierName: string;
  supplierCode: string | null;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = query.trim().length >= 2 ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [];

  async function confirmMatch() {
    if (!selected) return;
    setBusy(true);
    await manualMatchSupplierLinkAction({ supplierLinkId: linkId, productId: selected });
    setBusy(false);
    router.refresh();
  }

  async function dismiss() {
    setBusy(true);
    await dismissSupplierLinkAction({ supplierLinkId: linkId });
    setBusy(false);
    router.refresh();
  }

  return (
    <tr>
      <td>
        {supplierName}
        {supplierCode ? <div className="muted mono">{supplierCode}</div> : null}
      </td>
      <td style={{ minWidth: 260 }}>
        <input
          className="in"
          placeholder="Cerca il prodotto corretto…"
          value={selected ? products.find((p) => p.id === selected)?.name ?? query : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected("");
          }}
        />
        {filtered.length > 0 && !selected ? (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 2, left: 0, right: 0, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, zIndex: 5 }}>
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, background: "none", cursor: "pointer" }}
                  onClick={() => {
                    setSelected(p.id);
                    setQuery("");
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </td>
      <td>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-dark btn-sm" type="button" disabled={!selected || busy} onClick={confirmMatch}>
            Abbina
          </button>
          <button className="btn btn-line btn-sm" type="button" disabled={busy} onClick={dismiss}>
            Ignora
          </button>
        </div>
      </td>
    </tr>
  );
}
