"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductAction } from "@/lib/admin-actions";
import type { Product } from "@/generated/prisma";

export function AdminProductForm({ product }: { product: Product }) {
  const router = useRouter();
  const [supplierCode, setSupplierCode] = useState(product.supplierCode ?? "");
  const [costEuro, setCostEuro] = useState(product.supplierCostCents != null ? (product.supplierCostCents / 100).toFixed(2) : "");
  const [costVatTreatment, setCostVatTreatment] = useState(product.costVatTreatment);
  const [costIsEstimated, setCostIsEstimated] = useState(product.costIsEstimated);
  const [vatRate, setVatRate] = useState((product.vatRateBps / 100).toString());
  const [stockQty, setStockQty] = useState(product.stockQty != null ? String(product.stockQty) : "");
  const [published, setPublished] = useState(product.published);
  const [matchStatus, setMatchStatus] = useState(product.matchStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await updateProductAction({
      id: product.id,
      supplierCode: supplierCode || undefined,
      supplierCostCents: costEuro.trim() === "" ? null : Math.round(parseFloat(costEuro.replace(",", ".")) * 100),
      costVatTreatment,
      costIsEstimated,
      vatRateBps: Math.round(parseFloat(vatRate.replace(",", ".")) * 100),
      stockQty: stockQty.trim() === "" ? null : parseInt(stockQty, 10),
      published,
      matchStatus,
    });
    setSaving(false);
    if (result.ok) {
      setMessage("Salvato.");
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore durante il salvataggio.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
      {message ? <div className={`alert ${message === "Salvato." ? "ok" : "err"}`}>{message}</div> : null}

      <label className="fl">
        Codice fornitore
        <input className="in" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} />
      </label>

      <label className="fl">
        Costo fornitore (€)
        <input className="in" value={costEuro} onChange={(e) => setCostEuro(e.target.value)} placeholder="es. 72.00" />
      </label>

      <label className="fl">
        Trattamento IVA del costo
        <select className="in" value={costVatTreatment} onChange={(e) => setCostVatTreatment(e.target.value as typeof costVatTreatment)}>
          <option value="NET_OF_VAT">Netto IVA (il costo NON include IVA)</option>
          <option value="GROSS_WITH_VAT">Lordo (il costo include già IVA)</option>
        </select>
      </label>

      <label className="check">
        <input type="checkbox" checked={costIsEstimated} onChange={(e) => setCostIsEstimated(e.target.checked)} />
        Costo stimato (non verificato con il fornitore) — mostra &quot;indicativo&quot; ai clienti
      </label>

      <label className="fl">
        Aliquota IVA (%)
        <input className="in" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
      </label>

      <label className="fl">
        Quantità in stock (vuoto = non tracciata)
        <input className="in" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="es. 12, oppure vuoto" />
      </label>

      <label className="fl">
        Stato abbinamento fornitore
        <select className="in" value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as typeof matchStatus)}>
          <option value="UNMATCHED">Non abbinato</option>
          <option value="NEEDS_REVIEW">Da rivedere (ambiguo)</option>
          <option value="MATCHED">Abbinato (automatico)</option>
          <option value="MANUAL">Abbinato manualmente</option>
        </select>
      </label>

      <label className="check">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Pubblicato (visibile ai clienti)
      </label>

      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Salvataggio…" : "Salva modifiche"}
      </button>
    </form>
  );
}
