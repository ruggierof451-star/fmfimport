import { describe, expect, it } from "vitest";
import { computeCartTotals, extractVatCents, unitPriceCentsFor, formatEuro, type ShippingRules } from "./pricing";

const SHIPPING: ShippingRules = {
  freeShippingThresholdCents: 20000, // 200,00 €
  standardShippingFeeCents: 790, // 7,90 €
};

describe("unitPriceCentsFor", () => {
  it("returns the public price for a non-reseller", () => {
    expect(unitPriceCentsFor({ priceCents: 8990, resellerPriceCents: 7200 }, false)).toBe(8990);
  });

  it("returns the reseller price for an approved reseller when set", () => {
    expect(unitPriceCentsFor({ priceCents: 8990, resellerPriceCents: 7200 }, true)).toBe(7200);
  });

  it("falls back to the public price for a reseller when no reseller price is set", () => {
    expect(unitPriceCentsFor({ priceCents: 8990, resellerPriceCents: null }, true)).toBe(8990);
  });

  it("treats a missing public price as zero", () => {
    expect(unitPriceCentsFor({ priceCents: null, resellerPriceCents: null }, false)).toBe(0);
  });
});

describe("unitPriceCentsFor — scaglioni rivenditore per quantità", () => {
  const product = {
    priceCents: 8990,
    resellerPriceCents: 7200,
    resellerTiers: [
      { minQty: 12, priceCents: 6400 },
      { minQty: 6, priceCents: 6800 },
    ],
  };

  it("uses the base reseller price below the first tier", () => {
    expect(unitPriceCentsFor(product, true, "SEALED", 5)).toBe(7200);
  });

  it("applies the tier as soon as its minimum quantity is reached", () => {
    expect(unitPriceCentsFor(product, true, "SEALED", 6)).toBe(6800);
    expect(unitPriceCentsFor(product, true, "SEALED", 11)).toBe(6800);
  });

  it("picks the highest tier reached, regardless of the order tiers are stored in", () => {
    expect(unitPriceCentsFor(product, true, "SEALED", 12)).toBe(6400);
    expect(unitPriceCentsFor(product, true, "SEALED", 50)).toBe(6400);
  });

  it("never applies reseller tiers to non-resellers", () => {
    expect(unitPriceCentsFor(product, false, "SEALED", 50)).toBe(8990);
  });

  it("applies tiers even when no base reseller price is set", () => {
    expect(unitPriceCentsFor({ ...product, resellerPriceCents: null }, true, "SEALED", 3)).toBe(8990);
    expect(unitPriceCentsFor({ ...product, resellerPriceCents: null }, true, "SEALED", 6)).toBe(6800);
  });
});

describe("extractVatCents — scorporo IVA già inclusa nel prezzo (per la fattura, non cambia il totale)", () => {
  it("extracts 22% VAT from a VAT-inclusive amount", () => {
    expect(extractVatCents(12200, 2200)).toBe(2200); // 122,00 € lordi -> 100,00 € netti + 22,00 € IVA
  });

  it("is zero when the rate is zero", () => {
    expect(extractVatCents(10000, 0)).toBe(0);
  });

  it("rounds to the nearest cent", () => {
    expect(extractVatCents(13333, 2200)).toBe(2404);
  });
});

describe("computeCartTotals", () => {
  it("charges standard shipping below the free-shipping threshold", () => {
    const totals = computeCartTotals([{ unitPriceCents: 2000, quantity: 1 }], SHIPPING);
    expect(totals.qualifiesForFreeShipping).toBe(false);
    expect(totals.shippingCents).toBe(SHIPPING.standardShippingFeeCents);
    expect(totals.totalCents).toBe(totals.subtotalCents + SHIPPING.standardShippingFeeCents);
  });

  it("grants free shipping once the subtotal reaches the threshold", () => {
    const totals = computeCartTotals([{ unitPriceCents: 13090, quantity: 2 }], SHIPPING);
    expect(totals.subtotalCents).toBeGreaterThanOrEqual(SHIPPING.freeShippingThresholdCents);
    expect(totals.qualifiesForFreeShipping).toBe(true);
    expect(totals.shippingCents).toBe(0);
    expect(totals.freeShippingRemainderCents).toBe(0);
  });

  it("charges nothing and ships free for an empty cart (no phantom shipping fee)", () => {
    const totals = computeCartTotals([], SHIPPING);
    expect(totals.subtotalCents).toBe(0);
    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(0);
  });

  it("sums line totals for a mixed cart", () => {
    const totals = computeCartTotals(
      [
        { unitPriceCents: 2000, quantity: 11 },
        { unitPriceCents: 13090, quantity: 2 },
      ],
      SHIPPING
    );
    expect(totals.lines[0].lineTotalCents).toBe(22000);
    expect(totals.lines[1].lineTotalCents).toBe(26180);
    expect(totals.subtotalCents).toBe(totals.lines[0].lineTotalCents + totals.lines[1].lineTotalCents);
  });

  it("applies no discount by default", () => {
    const totals = computeCartTotals([{ unitPriceCents: 10000, quantity: 1 }], SHIPPING);
    expect(totals.discountCents).toBe(0);
    expect(totals.totalCents).toBe(totals.subtotalCents + totals.shippingCents);
  });

  it("applies a percentage discount to the subtotal, before adding shipping", () => {
    // 100,00 € subtotale, 5% sconto = 5,00 €; sotto soglia spedizione gratuita quindi +7,90 €.
    const totals = computeCartTotals([{ unitPriceCents: 10000, quantity: 1 }], SHIPPING, 500);
    expect(totals.subtotalCents).toBe(10000);
    expect(totals.discountCents).toBe(500);
    expect(totals.totalCents).toBe(10000 - 500 + SHIPPING.standardShippingFeeCents);
  });

  it("evaluates the free-shipping threshold on the pre-discount subtotal", () => {
    // 200,00 € di subtotale: sblocca la spedizione gratuita anche se lo sconto lo riduce sotto soglia.
    const totals = computeCartTotals([{ unitPriceCents: 20000, quantity: 1 }], SHIPPING, 1000);
    expect(totals.subtotalCents).toBe(20000);
    expect(totals.qualifiesForFreeShipping).toBe(true);
    expect(totals.shippingCents).toBe(0);
    expect(totals.discountCents).toBe(2000);
    expect(totals.totalCents).toBe(18000);
  });
});

describe("formatEuro", () => {
  it("formats cents as an Italian-locale euro amount", () => {
    expect(formatEuro(8990)).toBe("89,90 €");
  });
});
