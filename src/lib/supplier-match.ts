/**
 * Abbinamento tra una riga del listino fornitore (CSV/XLSX) e un prodotto del catalogo.
 *
 * Regola del brief: abbinare prima per codice prodotto ESATTO; altrimenti per nome
 * normalizzato ESATTO. Qualunque altro caso (nessuna corrispondenza, o più di una
 * corrispondenza possibile) è ambiguo e NON va applicato in automatico: va segnalato
 * per revisione manuale di un operatore.
 */
export function normalizeProductName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface MatchCandidate {
  id: string;
  supplierCode: string | null;
  name: string;
}

export type MatchOutcome =
  | { kind: "exact_code"; productId: string }
  | { kind: "exact_name"; productId: string }
  | { kind: "ambiguous"; candidateIds: string[] }
  | { kind: "none" };

export function matchSupplierRow(
  row: { supplierCode?: string | null; name: string },
  candidates: MatchCandidate[]
): MatchOutcome {
  const code = row.supplierCode?.trim();
  if (code) {
    const byCode = candidates.filter((c) => c.supplierCode && c.supplierCode.trim().toLowerCase() === code.toLowerCase());
    if (byCode.length === 1) return { kind: "exact_code", productId: byCode[0].id };
    if (byCode.length > 1) return { kind: "ambiguous", candidateIds: byCode.map((c) => c.id) };
  }

  const normalized = normalizeProductName(row.name);
  const byName = candidates.filter((c) => normalizeProductName(c.name) === normalized);
  if (byName.length === 1) return { kind: "exact_name", productId: byName[0].id };
  if (byName.length > 1) return { kind: "ambiguous", candidateIds: byName.map((c) => c.id) };

  return { kind: "none" };
}
