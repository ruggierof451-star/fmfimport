"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-context";

export function CouponField() {
  const { couponCode, applyCoupon, removeCoupon, quote, quoteLoading } = useCart();
  const [input, setInput] = useState("");

  const coupon = quote?.coupon ?? null;
  const applied = coupon && "code" in coupon ? coupon : null;
  const error = coupon && "error" in coupon ? coupon.error : null;

  if (couponCode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {applied ? (
          <div className="r ok" style={{ fontSize: 14 }}>
            <span>
              Codice <b className="mono">{applied.code}</b> applicato
            </span>
            <button type="button" className="x" aria-label="Rimuovi codice sconto" onClick={removeCoupon}>
              ×
            </button>
          </div>
        ) : error && !quoteLoading ? (
          <div className="r err" style={{ fontSize: 14 }}>
            <span>{error}</span>
            <button type="button" className="x" aria-label="Rimuovi codice sconto" onClick={removeCoupon}>
              ×
            </button>
          </div>
        ) : (
          <span className="muted" style={{ fontSize: 13 }}>
            Verifica codice…
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      style={{ display: "flex", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (input.trim()) applyCoupon(input);
      }}
    >
      <label htmlFor="coupon" className="sr">
        Codice sconto
      </label>
      <input
        id="coupon"
        className="in"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Codice sconto"
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-line btn-sm" disabled={!input.trim()}>
        Applica
      </button>
    </form>
  );
}
