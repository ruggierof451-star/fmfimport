"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-context";
import { formatEuro } from "@/lib/pricing";

export function CartDrawer() {
  const { items, quote, drawerOpen, closeDrawer, setQuantity, removeItem, count } = useCart();

  if (!drawerOpen) return null;

  return (
    <>
      <div className="scrim" onClick={closeDrawer} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Carrello">
        <div className="dh">
          <b>Carrello ({count})</b>
          <button className="x" aria-label="Chiudi carrello" onClick={closeDrawer}>
            ×
          </button>
        </div>
        <div className="db">
          {items.length === 0 ? (
            <div className="empty">
              <b>Il carrello è vuoto</b>
              <p>Aggiungi un prodotto dal catalogo.</p>
            </div>
          ) : (
            quote?.lines.map((line) => (
              <div className="line" key={line.productId}>
                <Link className="im" href={`/prodotto/${line.slug}`} aria-hidden="true" tabIndex={-1} />
                <div className="tx">
                  <Link href={`/prodotto/${line.slug}`}>{line.name}</Link>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {formatEuro(line.unitPriceCents)} cad.
                    {line.isBulkPricing ? (
                      <>
                        {" "}
                        · <b className="ok">prezzo quantità</b>
                      </>
                    ) : null}
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
            ))
          )}
        </div>
        {items.length > 0 && quote ? (
          <div className="df">
            <ShipBar
              missing={quote.totals.freeShippingRemainderCents}
              pct={Math.min(
                100,
                (quote.totals.subtotalCents / Math.max(1, quote.totals.subtotalCents + quote.totals.freeShippingRemainderCents)) * 100
              )}
            />
            <div className="sum" style={{ padding: 0, border: 0 }}>
              <div className="r">
                <span>Subtotale</span>
                <b>{formatEuro(quote.totals.subtotalCents)}</b>
              </div>
            </div>
            <Link href="/checkout" className="btn btn-gold" onClick={closeDrawer}>
              Vai al checkout
            </Link>
            <Link href="/carrello" className="btn btn-line btn-sm" onClick={closeDrawer}>
              Vedi carrello completo
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function ShipBar({ missing, pct }: { missing: number; pct: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
      {missing > 0 ? (
        <>Ti mancano <b>{formatEuro(missing)}</b> per la spedizione gratuita</>
      ) : (
        <b className="ok">Spedizione gratuita sbloccata</b>
      )}
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
