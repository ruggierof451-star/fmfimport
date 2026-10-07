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
