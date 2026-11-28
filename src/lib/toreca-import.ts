/**
 * Regole dell'importazione dal fornitore Toreca (torecaimport.com).
 * Funzioni pure: prezzo di vendita, nome normalizzato per scovare i doppioni, tipo e set.
 */

/** Prezzo di vendita: costo + ricarico, arrotondato per eccesso al ,90 (es. 152,50 → 152,90). */
export function salePriceCents(costCents: number, markupPct = 25): number {
  const euro = (costCents * (1 + markupPct / 100)) / 100;
  let rounded = Math.floor(euro) + 0.9;
  if (rounded < euro - 1e-9) rounded += 1;
  return Math.round(rounded * 100);
}

/**
 * Nome "di confronto": senza accenti, maiuscole, punteggiatura e parole che non distinguono
 * un prodotto dall'altro (Pokémon, JP/Japanese, booster box, ...). Due prodotti con lo
 * stesso nome di confronto sono considerati lo stesso prodotto.
 */
export function compareKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(pre-?order|preordine)\b/g, " ")
    .replace(/\b(pokemon|tcg|card game|japanese|giapponese|jp|jpn|edition|edizione)\b/g, " ")
    .replace(/\b(booster box|booster display|box)\b/g, " box ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tipologia del sito ricavata dal nome del prodotto Toreca. */
export function guessType(name: string): string {
  const n = name.toLowerCase();
  if (/playmat|sleeve|binder|deck box/.test(n)) return "Accessori";
  if (/promo (pack|card)|comic/.test(n)) return "Promo e pack";
  if (/card collection/.test(n)) return "Collection";
  if (/booster box|booster display/.test(n)) return "Booster box";
  // One Piece: i set con sigla (OP-16, EB-05, PRB-02) senza altre indicazioni sono booster box
  if (/\b(op|eb|prb)-\d+\b/.test(n) && !/deck|starter|tin|display/.test(n)) return "Booster box";
  if (/\bdeck\b/.test(n)) return "Deck";
  if (/\btin\b/.test(n)) return "Tin";
  if (/display/.test(n)) return "Display";
  if (/promo|pack\b/.test(n)) return "Promo e pack";
  return "Collection";
}

/** Nome del set: il nome senza marchio, lingua e formato (es. "Mega Brave Booster Box JP" → "Mega Brave"). */
export function guessSetName(name: string): string {
  const s = name
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(pre-?order)\b/gi, " ")
    .replace(/\bpok[eé]mon\b/gi, " ")
    .replace(/\bone piece( tcg| card game)?\b/gi, " ")
    .replace(/\b(booster box|booster display|premium deck set|special box|display)\b/gi, " ")
    .replace(/\b(JP|Japanese)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s || name.trim();
}

/**
 * Preordine solo se lo dice il nome. Il link non conta: Toreca lascia "preorder" nell'indirizzo
 * anche dopo l'uscita (es. Abyss Eye, Mega Dream ex, 30th Celebration, già disponibili).
 */
export function isPreorderName(name: string): boolean {
  return /pre-?order|preordine/i.test(name);
}
