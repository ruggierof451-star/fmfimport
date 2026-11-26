"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { formatEuro } from "@/lib/pricing";
import type { PackagingChoice } from "@/lib/pricing";

export interface PackagingOption {
  value: PackagingChoice;
  label: string;
  priceCents: number;
}

export function ProductBuyBox({
  productId,
  packagingOptions,
  maxQty,
  isPreorder,
  isResellerPrice,
}: {
  productId: string;
  packagingOptions: PackagingOption[];
  maxQty: number;
  isPreorder: boolean;
  isResellerPrice?: boolean;
}) {
  const { addItem, showToast } = useCart();
  const [qty, setQty] = useState(1);
  const [packaging, setPackaging] = useState<PackagingChoice>(packagingOptions[0]?.value ?? "SEALED");

  const priceCents = packagingOptions.find((o) => o.value === packaging)?.priceCents ?? packagingOptions[0]?.priceCents ?? 0;

  function clamp(n: number) {
    return Math.max(1, Math.min(maxQty, n));
  }

  return (
    <>
      {packagingOptions.length > 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>
            Come vuoi riceverlo
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {packagingOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                className={o.value === packaging ? "btn btn-dark btn-sm" : "btn btn-line btn-sm"}
                aria-pressed={o.value === packaging}
                onClick={() => setPackaging(o.value)}
              >
                {o.label} · {formatEuro(o.priceCents)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span className="bigprice">{formatEuro(priceCents)}</span>
        <span className="muted" style={{ fontSize: 14 }}>
          cad.
        </span>
        {isResellerPrice ? (
          <span className="pill" style={{ background: "var(--ok-wash)", borderColor: "var(--ok-wash)", color: "#155C33" }}>
            Prezzo rivenditore
          </span>
        ) : null}
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
            addItem(productId, qty, packaging);
            showToast("Aggiunto al carrello");
          }}
        >
          {maxQty <= 0 ? "Esaurito" : `Aggiungi · ${formatEuro(priceCents * qty)}`}
        </button>
      </div>
      {isPreorder ? (
        <div className="alert info">Preordine: spedizione all&apos;uscita del prodotto.</div>
      ) : null}
    </>
  );
}
