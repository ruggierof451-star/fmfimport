"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePricingSettingsAction } from "@/lib/admin-actions";
import type { PricingSettings } from "@/generated/prisma";

export function AdminPricingForm({ settings }: { settings: PricingSettings }) {
  const router = useRouter();
  const [margin, setMargin] = useState((settings.marginBps / 100).toString());
  const [marginBulk, setMarginBulk] = useState((settings.marginBulkBps / 100).toString());
  const [bulkThreshold, setBulkThreshold] = useState(String(settings.bulkThresholdQty));
  const [vat, setVat] = useState((settings.defaultVatRateBps / 100).toString());
  const [round90, setRound90] = useState(settings.roundTo90Cents);
  const [freeShip, setFreeShip] = useState((settings.freeShippingThresholdCents / 100).toFixed(2));
  const [shipFee, setShipFee] = useState((settings.standardShippingFeeCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updatePricingSettingsAction({
      marginBps: Math.round(parseFloat(margin.replace(",", ".")) * 100),
      marginBulkBps: Math.round(parseFloat(marginBulk.replace(",", ".")) * 100),
      bulkThresholdQty: parseInt(bulkThreshold, 10),
      defaultVatRateBps: Math.round(parseFloat(vat.replace(",", ".")) * 100),
      roundTo90Cents: round90,
      freeShippingThresholdCents: Math.round(parseFloat(freeShip.replace(",", ".")) * 100),
      standardShippingFeeCents: Math.round(parseFloat(shipFee.replace(",", ".")) * 100),
    });
    setSaving(false);
    setMessage(result.ok ? "Impostazioni salvate." : result.error ?? "Errore.");
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      {message ? <div className={`alert ${message.startsWith("Impostazioni") ? "ok" : "err"}`}>{message}</div> : null}
      <div className="alert info">
        Queste regole valgono per TUTTO il catalogo. Modificarle cambia i prezzi pubblici immediatamente su tutto il
        sito. Il regime IVA dell&apos;azienda non viene modificato automaticamente: verifica con il commercialista
        prima di cambiare l&apos;aliquota di default.
      </div>
      <label className="fl">
        Ricarico ordinario (%)
        <input className="in" value={margin} onChange={(e) => setMargin(e.target.value)} />
      </label>
      <label className="fl">
        Ricarico quantità (%)
        <input className="in" value={marginBulk} onChange={(e) => setMarginBulk(e.target.value)} />
      </label>
      <label className="fl">
        Soglia quantità (pezzi — il ricarico ridotto si applica OLTRE questo numero)
        <input className="in" value={bulkThreshold} onChange={(e) => setBulkThreshold(e.target.value)} />
      </label>
      <label className="fl">
        Aliquota IVA di default per i nuovi prodotti (%)
        <input className="in" value={vat} onChange={(e) => setVat(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={round90} onChange={(e) => setRound90(e.target.checked)} />
        Arrotonda il prezzo pubblico a ,90 (arrotondamento commerciale)
      </label>
      <label className="fl">
        Soglia spedizione gratuita (€)
        <input className="in" value={freeShip} onChange={(e) => setFreeShip(e.target.value)} />
      </label>
      <label className="fl">
        Costo spedizione standard (€)
        <input className="in" value={shipFee} onChange={(e) => setShipFee(e.target.value)} />
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Salvataggio…" : "Salva regole di prezzo"}
      </button>
    </form>
  );
}
