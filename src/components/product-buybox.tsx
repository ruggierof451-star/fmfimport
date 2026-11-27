"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { formatEuro } from "@/lib/pricing";
import type { PackagingChoice } from "@/lib/pricing";
import { MAX_VARIANT_QTY } from "@/lib/variants";

export interface PackagingOption {
  value: PackagingChoice;
  label: string;
  priceCents: number;
}

export interface BuyBoxVariant {
  id: string;
  name: string;
  priceCents: number;
}

const MAIN = "__main__";

const sectionLabel = { fontSize: 13, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" } as const;

export function ProductBuyBox({
  productId,
  packagingOptions,
  mainLabel,
  variants = [],
  maxQty,
  isPreorder,
  isResellerPrice,
}: {
  productId: string;
  packagingOptions: PackagingOption[];
  /** Nome dell'opzione "prodotto principale" nel selettore varianti (es. "Booster box"). */
  mainLabel?: string;
  /** Varianti acquistabili (es. "Busta singola"), con prezzo proprio. */
  variants?: BuyBoxVariant[];
  /** Quantità massima del prodotto principale (le varianti non hanno magazzino proprio). */
  maxQty: number;
  isPreorder: boolean;
  isResellerPrice?: boolean;
}) {
  const { addItem, showToast } = useCart();
  const [qty, setQty] = useState(1);
  const [packaging, setPackaging] = useState<PackagingChoice>(packagingOptions[0]?.value ?? "SEALED");
  // Se il prodotto principale è esaurito ma ci sono varianti, si parte dalla prima variante.
  const [selected, setSelected] = useState<string>(maxQty <= 0 && variants.length ? variants[0].id : MAIN);

  const variant = selected === MAIN ? null : (variants.find((v) => v.id === selected) ?? null);
  const mainPriceCents = packagingOptions.find((o) => o.value === packaging)?.priceCents ?? packagingOptions[0]?.priceCents ?? 0;
  const priceCents = variant ? variant.priceCents : mainPriceCents;
  const limit = variant ? MAX_VARIANT_QTY : maxQty;
  const soldOut = limit <= 0;

  function clamp(n: number, max = limit) {
    return Math.max(1, Math.min(Math.max(1, max), n));
  }

  function choose(id: string) {
    setSelected(id);
    const nextLimit = id === MAIN ? maxQty : MAX_VARIANT_QTY;
    setQty((q) => clamp(q, nextLimit));
  }

  return (
    <>
      {variants.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={sectionLabel}>Formato</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={selected === MAIN ? "btn btn-dark btn-sm" : "btn btn-line btn-sm"}
              aria-pressed={selected === MAIN}
              onClick={() => choose(MAIN)}
            >
              {mainLabel || "Prodotto intero"} · {maxQty <= 0 ? "Esaurito" : formatEuro(packagingOptions[0]?.priceCents ?? 0)}
            </button>
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={selected === v.id ? "btn btn-dark btn-sm" : "btn btn-line btn-sm"}
                aria-pressed={selected === v.id}
                onClick={() => choose(v.id)}
              >
                {v.name} · {formatEuro(v.priceCents)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!variant && packagingOptions.length > 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={sectionLabel}>Come vuoi riceverlo</span>
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
        {isResellerPrice && !variant ? (
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
          disabled={soldOut}
          onClick={() => {
            if (variant) addItem(productId, qty, undefined, variant.id);
            else addItem(productId, qty, packaging);
            showToast("Aggiunto al carrello");
          }}
        >
          {soldOut ? "Esaurito" : `Aggiungi · ${formatEuro(priceCents * qty)}`}
        </button>
      </div>
      {isPreorder ? (
        <div className="alert info">Preordine: spedizione all&apos;uscita del prodotto.</div>
      ) : null}
    </>
  );
}
