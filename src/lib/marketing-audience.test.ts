import { describe, expect, it } from "vitest";
import { computeAudience, countSegments } from "./marketing-audience";

describe("pubblico email marketing", () => {
  const audience = computeAudience({
    users: [
      { email: "Mario@Example.com", name: "Mario Rossi", role: "CUSTOMER" },
      { email: "shop@negozio.it", name: "Negozio", role: "RESELLER" },
    ],
    subscribers: [
      { email: "mario@example.com", interests: ["onepiece", "sconosciuto"] },
      { email: "anna@example.com", interests: ["pokemon"] },
    ],
    paidOrders: [
      { email: "mario@example.com", games: ["POKEMON"] },
      { email: "senza-consenso@example.com", games: ["YUGIOH"] },
      { email: null, games: ["DRAGON_BALL"] },
    ],
  });

  it("unisce account e newsletter sulla stessa email (senza duplicati)", () => {
    expect([...audience.keys()].sort()).toEqual(["anna@example.com", "mario@example.com", "shop@negozio.it"]);
    expect(audience.get("mario@example.com")?.firstName).toBe("Mario");
  });

  it("assegna i segmenti da interessi, acquisti e ruolo", () => {
    expect([...audience.get("mario@example.com")!.segments].sort()).toEqual(["all", "clienti", "onepiece", "pokemon"]);
    expect([...audience.get("anna@example.com")!.segments].sort()).toEqual(["all", "pokemon"]);
    expect([...audience.get("shop@negozio.it")!.segments].sort()).toEqual(["all", "rivenditori"]);
  });

  it("non include chi ha comprato senza consenso", () => {
    expect(audience.has("senza-consenso@example.com")).toBe(false);
  });

  it("conta i segmenti", () => {
    const c = countSegments(audience);
    expect(c.all).toBe(3);
    expect(c.clienti).toBe(1);
    expect(c.pokemon).toBe(2);
    expect(c.yugioh).toBe(0);
  });
});
