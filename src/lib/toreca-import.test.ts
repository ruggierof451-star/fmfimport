import { describe, expect, it } from "vitest";
import { compareKey, guessSetName, guessType, isPreorderName, salePriceCents } from "./toreca-import";

describe("salePriceCents", () => {
  it("costo + 25% arrotondato per eccesso al ,90", () => {
    expect(salePriceCents(12200)).toBe(15290); // 152,50 → 152,90
    expect(salePriceCents(10000)).toBe(12590); // 125,00 → 125,90
    expect(salePriceCents(12232)).toBe(15290); // 152,90 esatto resta 152,90
    expect(salePriceCents(12240)).toBe(15390); // 153,00 → 153,90
  });
});

describe("compareKey", () => {
  it("riconosce lo stesso prodotto scritto in modi diversi", () => {
    expect(compareKey("Pokémon Stellar Miracle Booster Box Japanese")).toBe(compareKey("Stellar Miracle Booster Box JP"));
    expect(compareKey("Pokémon Abyss Eye Booster Box JP")).toBe(compareKey("Abyss Eye Booster Box JP"));
    expect(compareKey("Mega Brave Booster Box JP")).not.toBe(compareKey("Mega Symphonia Booster Box JP"));
  });
});

describe("guessType / guessSetName / isPreorderName", () => {
  it("ricava tipo, set e preordine dal nome", () => {
    expect(guessType("Mega Brave Booster Box JP")).toBe("Booster box");
    expect(guessType("Pokemon 30th Celebration Premium Deck Set JP")).toBe("Deck");
    expect(guessType("Pokémon Center Fukuoka Special Box JP")).toBe("Collection");
    expect(guessSetName("Pokémon Mega Dream Ex Booster Box JP")).toBe("Mega Dream Ex");
    expect(guessType("One Piece OP-16 The Time of Battle JP")).toBe("Booster box");
    expect(guessType("One Piece PRB-02 The Best Vol.2 JP")).toBe("Booster box");
    expect(guessType("One Piece Base Shop Limited Playmat Vol.2 JP")).toBe("Accessori");
    expect(guessType("One Piece Saikyo Jump Summit War Power Promo Pack JP")).toBe("Promo e pack");
    expect(guessType("One Piece TCG Luffy Ichiban Kuji Promo Card OP13-001 JP")).toBe("Promo e pack");
    expect(guessType("One Piece Base Shop Limited Card Collection Vol.1 JP")).toBe("Collection");
    expect(guessSetName("One Piece OP-14 The Seven Warlords of the Sea Booster Box JP")).toBe("OP-14 The Seven Warlords of the Sea");
    expect(isPreorderName("Pokemon 30th Celebration Booster Box JP")).toBe(false);
    expect(isPreorderName("[PRE-ORDER] Pokemon Nuovo Set Booster Box JP")).toBe(true);
  });
});
