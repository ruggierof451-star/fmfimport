import { describe, expect, it } from "vitest";
import { matchSupplierRow, normalizeProductName, type MatchCandidate } from "./supplier-match";

describe("normalizeProductName", () => {
  it("lowercases, strips accents and punctuation, collapses whitespace", () => {
    expect(normalizeProductName("Pokémon 151 Booster Box JP!")).toBe("pokemon 151 booster box jp");
  });

  it("strips bracketed tags like [B-GRADE]", () => {
    expect(normalizeProductName("[B-GRADE] Night Wanderer Booster Box JP")).toBe("night wanderer booster box jp");
  });
});

describe("matchSupplierRow", () => {
  const candidates: MatchCandidate[] = [
    { id: "p1", supplierCode: "OP-14", name: "One Piece OP-14 The Seven Warlords of the Sea Booster Box JP" },
    { id: "p2", supplierCode: "OP-15", name: "One Piece OP-15 Adventure on Kami's Island Booster Box JP" },
    { id: "p3", supplierCode: null, name: "Glory of Team Rocket Booster Box JP" },
  ];

  it("matches on an exact supplier code when unique", () => {
    const result = matchSupplierRow({ supplierCode: "OP-14", name: "anything" }, candidates);
    expect(result).toEqual({ kind: "exact_code", productId: "p1" });
  });

  it("falls back to exact normalized name when no code is given", () => {
    const result = matchSupplierRow({ name: "glory of team rocket booster box jp" }, candidates);
    expect(result).toEqual({ kind: "exact_name", productId: "p3" });
  });

  it("never auto-matches a similar-but-different name", () => {
    const result = matchSupplierRow({ name: "Glory of Team Rocket Booster Box KR" }, candidates);
    expect(result.kind).not.toBe("exact_name");
    expect(result.kind).not.toBe("exact_code");
  });

  it("flags an ambiguous code match (two products sharing it) instead of picking one", () => {
    const dupCandidates: MatchCandidate[] = [...candidates, { id: "p4", supplierCode: "OP-14", name: "A different edition OP-14" }];
    const result = matchSupplierRow({ supplierCode: "OP-14", name: "anything" }, dupCandidates);
    expect(result.kind).toBe("ambiguous");
  });

  it("returns none when nothing matches", () => {
    const result = matchSupplierRow({ name: "Completely Unrelated Product" }, candidates);
    expect(result).toEqual({ kind: "none" });
  });
});

describe("matchSupplierRow — B-Grade vs regular disambiguation", () => {
  const pair: MatchCandidate[] = [
    { id: "new1", supplierCode: "WANDERER-BOX_1", name: "Night Wanderer Booster Box JP", condition: "NEW" },
    { id: "bg1", supplierCode: "BGRADE-WANDERERJP_1", name: "[B-GRADE] Night Wanderer Booster Box JP", condition: "B_GRADE" },
  ];

  it("resolves to the B-grade candidate when the supplier row's code signals B-GRADE", () => {
    const result = matchSupplierRow({ supplierCode: "BGRADE-WANDERERJP_1", name: "[B-GRADE] Night Wanderer Booster Box JP" }, pair);
    expect(result).toEqual({ kind: "exact_code", productId: "bg1" });
  });

  it("resolves to the regular candidate when the supplier row has no B-GRADE signal", () => {
    const result = matchSupplierRow({ supplierCode: "WANDERER-BOX_1", name: "Night Wanderer Booster Box JP" }, pair);
    expect(result).toEqual({ kind: "exact_code", productId: "new1" });
  });

  it("still reports ambiguous when conditions are identical (a real duplicate)", () => {
    const dupPair: MatchCandidate[] = [
      { id: "x1", supplierCode: null, name: "Some Box JP", condition: "NEW" },
      { id: "x2", supplierCode: null, name: "Some Box JP", condition: "NEW" },
    ];
    const result = matchSupplierRow({ name: "Some Box JP" }, dupPair);
    expect(result.kind).toBe("ambiguous");
  });
});
