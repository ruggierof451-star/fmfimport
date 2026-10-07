import { describe, expect, it } from "vitest";
import {
  bulkPriceCents,
  computeCartTotals,
  computeInvoiceVatCents,
  netCostCents,
  round90,
  standardPriceCents,
  unitPriceCentsForQty,
  type PricingRules,
  type ShippingRules,
} from "./pricing";

const RULES: PricingRules = {
  marginBps: 3000, // 30%
  marginBulkBps: 2000, // 20%
  bulkThresholdQty: 10,
  roundTo90Cents: true,
};

const SHIPPING: ShippingRules = {
  freeShippingThresholdCents: 20000, // 200,00 €
  standardShippingFeeCents: 790, // 7,90 €
};

describe("round90", () => {
  it("rounds up to the smallest ,90 ending >= the value", () => {
    expect(round90(4480)).toBe(4490); // 44,80 -> 44,90
    expect(round90(4495)).toBe(4590); // 44,95 -> 45,90
    expect(round90(4500)).toBe(4590); // 45,00 -> 45,90 (never equals a whole euro)
    expect(round90(4490)).toBe(4490); // already exact -> unchanged
    expect(round90(1000)).toBe(1090); // 10,00 -> 10,90
  });

  it("never rounds a price down below its pre-rounding value", () => {
    for (const cents of [1, 50, 99, 100, 101, 4999, 5000, 5001, 999999]) {
      expect(round90(cents)).toBeGreaterThanOrEqual(cents);
    }
  });
});

describe("netCostCents", () => {
  it("returns the cost unchanged when already net of VAT", () => {
    expect(netCostCents({ costCents: 7200, costVatTreatment: "NET_OF_VAT", vatRateBps: 2200 })).toBe(7200);
  });

  it("strips VAT when the supplier cost is marked gross", () => {
    // 8784 gross at 22% VAT -> 7200 net (8784 / 1.22 = 7200)
    expect(netCostCents({ costCents: 8784, costVatTreatment: "GROSS_WITH_VAT", vatRateBps: 2200 })).toBe(7200);
  });
});

describe("standardPriceCents / bulkPriceCents — price = cost x margin, no VAT added", () => {
  // Cost 135,77 € (real Toreca cost), 30% margin: 135.77 * 1.30 = 176.501 -> 17650 -> round90 -> 17690
  it("applies the 30% margin and rounds to ,90 (standard tier)", () => {
    const price = standardPriceCents(
      { costCents: 13577, costVatTreatment: "NET_OF_VAT", vatRateBps: 2200 },
      RULES
    );
    expect(price).toBe(17690);
  });

  // Cost 135,77 €, 20% margin: 135.77 * 1.20 = 162.924 -> 16292 -> round90 -> 16390
  it("applies the reduced 20% margin on the bulk tier", () => {
    const price = bulkPriceCents(
      { costCents: 13577, costVatTreatment: "NET_OF_VAT", vatRateBps: 2200 },
      RULES
    );
    expect(price).toBe(16390);
  });

  it("the bulk price is always lower than the standard price for the same product", () => {
    const product = { costCents: 4000, costVatTreatment: "NET_OF_VAT" as const, vatRateBps: 2200 };
    expect(bulkPriceCents(product, RULES)).toBeLessThan(standardPriceCents(product, RULES));
  });

  it("never applies a VAT multiplier on top of the margin", () => {
    // cost 10000 ("100,00 €"), 30% margin, no VAT -> 13000 -> round90 -> 13090.
    // If VAT were still being added this would come out around 15970 instead.
    const price = standardPriceCents({ costCents: 10000, costVatTreatment: "NET_OF_VAT", vatRateBps: 2200 }, RULES);
    expect(price).toBe(13090);
  });
});

describe("unitPriceCentsForQty — the >10 threshold", () => {
  const product = { costCents: 13577, costVatTreatment: "NET_OF_VAT" as const, vatRateBps: 2200 };

  it("uses the standard price at exactly the threshold quantity (10)", () => {
    expect(unitPriceCentsForQty(product, RULES, 10)).toBe(standardPriceCents(product, RULES));
  });

  it("uses the bulk price only strictly above the threshold (11+)", () => {
    expect(unitPriceCentsForQty(product, RULES, 11)).toBe(bulkPriceCents(product, RULES));
  });

  it("uses the standard price for quantity 1", () => {
    expect(unitPriceCentsForQty(product, RULES, 1)).toBe(standardPriceCents(product, RULES));
  });
});

describe("computeInvoiceVatCents", () => {
  it("computes 22% of the order total", () => {
    expect(computeInvoiceVatCents(10000, 2200)).toBe(2200); // 100,00 € -> 22,00 €
  });

  it("is zero when the rate is zero", () => {
    expect(computeInvoiceVatCents(10000, 0)).toBe(0);
  });

  it("rounds to the nearest cent", () => {
    // 133,33 € * 22% = 29,3326 € -> 2933 cents
    expect(computeInvoiceVatCents(13333, 2200)).toBe(2933);
  });
});

describe("computeCartTotals", () => {
  const cheapProduct = { costCents: 2000, costVatTreatment: "NET_OF_VAT" as const, vatRateBps: 2200 };
  const expensiveProduct = { costCents: 10000, costVatTreatment: "NET_OF_VAT" as const, vatRateBps: 2200 };

  it("charges standard shipping below the free-shipping threshold", () => {
    const totals = computeCartTotals([{ product: cheapProduct, quantity: 1 }], RULES, SHIPPING);
    expect(totals.qualifiesForFreeShipping).toBe(false);
    expect(totals.shippingCents).toBe(SHIPPING.standardShippingFeeCents);
    expect(totals.totalCents).toBe(totals.subtotalCents + SHIPPING.standardShippingFeeCents);
  });

  it("grants free shipping once the subtotal reaches the threshold", () => {
    // standard price of expensiveProduct: 100 * 1.30 = 130 -> round90 -> 130,90; x2 = 261,80 >= 200
    const totals = computeCartTotals([{ product: expensiveProduct, quantity: 2 }], RULES, SHIPPING);
    expect(totals.subtotalCents).toBeGreaterThanOrEqual(SHIPPING.freeShippingThresholdCents);
    expect(totals.qualifiesForFreeShipping).toBe(true);
    expect(totals.shippingCents).toBe(0);
    expect(totals.freeShippingRemainderCents).toBe(0);
  });

  it("charges nothing and ships free for an empty cart (no phantom shipping fee)", () => {
    const totals = computeCartTotals([], RULES, SHIPPING);
    expect(totals.subtotalCents).toBe(0);
    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(0);
  });

  it("applies bulk pricing to an 11-unit line and reports the discount vs. standard pricing", () => {
    const totals = computeCartTotals([{ product: cheapProduct, quantity: 11 }], RULES, SHIPPING);
    const line = totals.lines[0];
    expect(line.isBulkPricing).toBe(true);
    expect(line.unitPriceCents).toBeLessThan(line.standardUnitPriceCents);
    expect(totals.bulkDiscountCents).toBeGreaterThan(0);
    expect(totals.subtotalCents).toBe(line.unitPriceCents * 11);
  });

  it("mixes a bulk line and a standard line correctly in the same cart", () => {
    const totals = computeCartTotals(
      [
        { product: cheapProduct, quantity: 11 }, // bulk tier
        { product: expensiveProduct, quantity: 2 }, // standard tier
      ],
      RULES,
      SHIPPING
    );
    expect(totals.lines[0].isBulkPricing).toBe(true);
    expect(totals.lines[1].isBulkPricing).toBe(false);
    expect(totals.subtotalCents).toBe(totals.lines[0].lineTotalCents + totals.lines[1].lineTotalCents);
  });
});
