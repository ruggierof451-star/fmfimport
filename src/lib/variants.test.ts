import { describe, expect, it } from "vitest";
import { findVariant, lineDisplayName, lineIsOutOfStock, lineMaxQty, lineUnitPriceCents, MAX_VARIANT_QTY } from "./variants";

const box = { priceCents: 18990, resellerPriceCents: 15990, noWrapPriceCents: 17990, damagedPriceCents: null };
const busta = { id: "v1", name: "Busta singola", priceCents: 690 };

describe("varianti prodotto", () => {
  it("trova solo varianti del prodotto", () => {
    expect(findVariant([busta], "v1")).toEqual(busta);
    expect(findVariant([busta], "altro")).toBeNull();
    expect(findVariant([busta], undefined)).toBeNull();
  });

  it("la variante usa sempre il suo prezzo pubblico, anche per i rivenditori e senza confezione", () => {
    expect(lineUnitPriceCents(box, busta, false, "SEALED")).toBe(690);
    expect(lineUnitPriceCents(box, busta, true, "NO_WRAP")).toBe(690);
  });

  it("il prodotto principale mantiene prezzo rivenditore e confezione", () => {
    expect(lineUnitPriceCents(box, null, true, "SEALED")).toBe(15990);
    expect(lineUnitPriceCents(box, null, false, "NO_WRAP")).toBe(17990);
    expect(lineUnitPriceCents(box, null, false, "SEALED")).toBe(18990);
  });

  it("le varianti non seguono il magazzino del prodotto principale", () => {
    expect(lineIsOutOfStock(0, busta)).toBe(false);
    expect(lineIsOutOfStock(0, null)).toBe(true);
    expect(lineMaxQty(2, busta)).toBe(MAX_VARIANT_QTY);
    expect(lineMaxQty(2, null)).toBe(2);
  });

  it("nome riga con variante", () => {
    expect(lineDisplayName("Rivali Predestinati Booster Box", busta)).toBe("Rivali Predestinati Booster Box — Busta singola");
    expect(lineDisplayName("Rivali Predestinati Booster Box", null)).toBe("Rivali Predestinati Booster Box");
  });
});
