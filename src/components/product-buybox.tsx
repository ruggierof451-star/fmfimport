"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { formatEuro } from "@/lib/pricing";

export function ProductBuyBox({
  productId,
  standardPriceCents,
  bulkPriceCents,
  bulkThresholdQty,
  maxQty,
  isPreorder,
}: {
  productId: string;
  standardPriceCents: number;
  bulkPriceCents: number;
  bulkThresholdQty: number;
  maxQty: number;
  isPreorder: boolean;
}) {
  const { addItem, showToast } = useCart();
  const [qty, setQty] = useState(1);
  const isBulk = qty > bulkThresholdQty;
  const unit = isBulk ? bulkPriceCents : standardPriceCents;

  function clamp(n: number) {
    return Math.max(1, Math.min(maxQty, n));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span className="bigprice">{formatEuro(unit)}</span>
        <span className="muted" style={{ fontSize: 14 }}>
          cad.
        </span>
        {isBulk ? (
          <span className="pill" style={{ background: "var(--ok-wash)", borderColor: "var(--ok-wash)", color: "#155C33" }}>
            Prezzo quantità applicato
          </span>
        ) : null}
      </div>
      <div className="tiers">
        <div className={isBulk ? "" : "on"}>
          <span>da 1 a {bulkThresholdQty} pezzi</span>
          <b>{formatEuro(standardPriceCents)}</b>
        </div>
        <div className={isBulk ? "on" : ""}>
          <span>oltre {bulkThresholdQty} pezzi</span>
          <b>{formatEuro(bulkPriceCents)}</b>
        </div>
      </div>
      <div className="buyrow">
        <div className="qty">
          <button type="button" onClick={() => setQty((q) => clamp(q - 1))} aria-label="Diminuisci quantità">
            −
          </button>
          <label htmlFor="pqty" className="sr">
            Quantità
          </label>
          <input
            id="pqty"
            inputMode="numeric"
            value={qty}
            onChange={(e) => {
              const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
              setQty(Number.isFinite(n) ? clamp(n) : 1);
            }}
          />
          <button type="button" onClick={() => setQty((q) => clamp(q + 1))} aria-label="Aumenta quantità">
            +
          </button>
        </div>
        <button
          type="button"
          className="btn btn-gold"
          disabled={maxQty <= 0}
          onClick={() => {
            addItem(productId, qty);
            showToast("Aggiunto al carrello");
          }}
        >
          {maxQty <= 0 ? "Esaurito" : `Aggiungi · ${formatEuro(unit * qty)}`}
        </button>
      </div>
      {!isBulk ? (
        <div className="muted" style={{ fontSize: 14 }}>
          Con {bulkThresholdQty + 1} o più pezzi paghi {formatEuro(bulkPriceCents)} cad.
        </div>
      ) : null}
      {isPreorder ? (
        <div className="alert info">Preordine: spedizione all&apos;uscita del prodotto.</div>
      ) : null}
    </>
  );
}
