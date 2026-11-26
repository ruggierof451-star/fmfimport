"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePricingSettingsAction } from "@/lib/admin-actions";
import type { PricingSettings } from "@/generated/prisma";

export function AdminPricingForm({ settings }: { settings: PricingSettings }) {
  const router = useRouter();
  const [vat, setVat] = useState((settings.invoiceVatRateBps / 100).toString());
  const [freeShip, setFreeShip] = useState((settings.freeShippingThresholdCents / 100).toFixed(2));
  const [shipFee, setShipFee] = useState((settings.standardShippingFeeCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updatePricingSettingsAction({
      invoiceVatRateBps: Math.round(parseFloat(vat.replace(",", ".")) * 100),
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
        I prezzi esposti sono SEMPRE IVA INCLUSA. L&apos;aliquota qui sotto serve solo a scorporare la quota IVA
        mostrata in fattura: non cambia il totale pagato dal cliente. Verifica questa impostazione con il
        commercialista.
      </div>
      <label className="fl">
        Aliquota IVA di fattura (%)
        <input className="in" value={vat} onChange={(e) => setVat(e.target.value)} />
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
        {saving ? "Salvataggio…" : "Salva impostazioni"}
      </button>
    </form>
  );
}
