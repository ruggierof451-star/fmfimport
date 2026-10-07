"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-context";
import { ShipBar } from "@/components/cart-drawer";
import { formatEuro } from "@/lib/pricing";

export function CartPageClient() {
  const { items, quote, setQuantity, removeItem, count } = useCart();

  if (items.length === 0) {
    return (
      <main className="wrap page" style={{ gap: 24 }}>
        <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500 }}>Carrello</h1>
        <div className="empty">
          <b>Il carrello è vuoto</b>
          <p>Scegli tra i prodotti Pokémon e One Piece del catalogo.</p>
          <Link className="btn btn-dark btn-sm" href="/">
            Vai al catalogo
          </Link>
        </div>
      </main>
    );
  }

  const totals = quote?.totals;

  return (
    <main className="wrap page" style={{ gap: 24 }}>
      <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500 }}>Carrello</h1>
      {quote?.adjusted.length ? (
        <div className="alert info">
          La disponibilità di alcuni articoli è cambiata: le quantità sono state adeguate allo stock reale.
        </div>
      ) : null}
      <div className="two">
        <div className="a">
          {quote?.lines.map((line) => (
            <div className="line" key={line.productId}>
              <Link className="im" href={`/prodotto/${line.slug}`} aria-hidden="true" tabIndex={-1} />
              <div className="tx">
                <Link href={`/prodotto/${line.slug}`}>{line.name}</Link>
                <span className="muted" style={{ fontSize: 13 }}>
                  {line.language} · {formatEuro(line.unitPriceCents)} cad.
                  {line.isBulkPricing ? (
                    <>
                      {" "}
                      · <b className="ok">prezzo quantità</b>
                    </>
                  ) : (
                    <span className="muted"> · oltre {quote.bulkThresholdQty} pz: {formatEuro(line.bulkUnitPriceCents)} → sconto automatico</span>
                  )}
                </span>
              </div>
              <div className="rt">
                <div className="qty">
                  <button onClick={() => setQuantity(line.productId, line.quantity - 1)} aria-label="Diminuisci">
                    −
                  </button>
                  <input readOnly value={line.quantity} />
                  <button onClick={() => setQuantity(line.productId, line.quantity + 1)} aria-label="Aumenta">
                    +
                  </button>
                </div>
                <span className="tot">{formatEuro(line.lineTotalCents)}</span>
                <button className="x" aria-label="Rimuovi" onClick={() => removeItem(line.productId)}>
                  ×
                </button>
              </div>
            </div>
          ))}
          <div className="alert info" style={{ fontWeight: 500 }}>
            Prezzo quantità: oltre {quote?.bulkThresholdQty ?? 10} pezzi dello stesso articolo il prezzo unitario scende
            automaticamente.
          </div>
          <Link href="/" style={{ fontWeight: 700 }}>
            ← Continua lo shopping
          </Link>
        </div>
        <div className="b">
          {totals ? (
            <div className="sum">
              <ShipBar
                missing={totals.freeShippingRemainderCents}
                pct={Math.min(100, (totals.subtotalCents / Math.max(1, totals.subtotalCents + totals.freeShippingRemainderCents)) * 100)}
              />
              <div className="r">
                <span>Prodotti ({count})</span>
                <span>{formatEuro(totals.fullPriceSubtotalCents)}</span>
              </div>
              {totals.bulkDiscountCents > 0 ? (
                <div className="r ok">
                  <span>Sconto quantità</span>
                  <span>−{formatEuro(totals.bulkDiscountCents)}</span>
                </div>
              ) : null}
              <div className="r">
                <span>Spedizione</span>
                <span>{totals.shippingCents ? formatEuro(totals.shippingCents) : <b className="ok">Gratis</b>}</span>
              </div>
              <div className="r t">
                <span>Totale</span>
                <span>{formatEuro(totals.totalCents)}</span>
              </div>
              {quote?.hasEstimatedPrices ? <span className="muted" style={{ fontSize: 13 }}>Contiene prezzi indicativi.</span> : null}
              <Link href="/checkout" className="btn btn-gold">
                Procedi al checkout
              </Link>
              <span className="muted" style={{ fontSize: 13, textAlign: "center" }}>
                Puoi acquistare anche senza registrarti.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
