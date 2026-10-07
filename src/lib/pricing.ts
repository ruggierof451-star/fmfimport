/**
 * Motore prezzi — FMF Import.
 *
 * Regole:
 *  - Prezzo pubblico = costo fornitore (Toreca) × 1,30 (ricarico ordinario 30%).
 *  - Prezzo quantità = costo fornitore × 1,20 (ricarico 20%) quando la quantità DELLO
 *    STESSO ARTICOLO nel carrello è SUPERIORE alla soglia (default 10, quindi da 11 pezzi).
 *  - Nessuna IVA viene aggiunta separatamente sopra il ricarico: il prezzo pubblico è
 *    semplicemente costo × margine. Il trattamento fiscale (se e come esporre l'IVA in
 *    fattura) resta da definire col commercialista — qui non viene calcolato né mostrato.
 *  - Arrotondamento commerciale: il prezzo pubblico termina sempre in ",90" (per eccesso).
 *  - Spedizione gratuita sopra una soglia sul subtotale.
 *
 * Tutti gli importi sono interi in centesimi. Le percentuali sono interi in "bps"
 * (basis points, decimi di punto percentuale: 3000 = 30,00%, 2200 = 22,00%).
 * Non usare mai Number in virgola mobile per importi: niente arrotondamenti a sorpresa.
 */

export type CostVatTreatment = "NET_OF_VAT" | "GROSS_WITH_VAT";

export interface ProductPricingInput {
  /** Costo fornitore memorizzato, null se non ancora noto (si usa solo per prodotti con stima). */
  costCents: number;
  /**
   * Se il costo del fornitore arriva comprensivo di un'IVA che va scorporata prima di
   * applicare il ricarico (es. un listino che include l'IVA del fornitore estero).
   * Non ha a che fare con l'IVA del prezzo pubblico, che qui non viene applicata.
   */
  costVatTreatment: CostVatTreatment;
  /** Aliquota usata solo per scorporare il costo quando costVatTreatment è GROSS_WITH_VAT. */
  vatRateBps: number;
}

export interface PricingRules {
  marginBps: number;
  marginBulkBps: number;
  bulkThresholdQty: number;
  roundTo90Cents: boolean;
}

export interface ShippingRules {
  freeShippingThresholdCents: number;
  standardShippingFeeCents: number;
}

/** Arrotonda al centesimo più vicino (per calcoli intermedi, mai per il prezzo finale esposto). */
function roundCents(value: number): number {
  return Math.round(value);
}

/**
 * Arrotondamento commerciale a ",90": il più piccolo importo della forma k,90 (k intero)
 * che sia maggiore o uguale al valore dato. Non abbassa mai il prezzo sotto il costo+margine.
 */
export function round90(cents: number): number {
  const flo = Math.floor(cents / 100) * 100 + 90;
  return flo >= cents ? flo : flo + 100;
}

/** Ricava il costo netto dal costo memorizzato, scorporando l'IVA solo se il costo è marcato lordo. */
export function netCostCents(input: ProductPricingInput): number {
  if (input.costVatTreatment === "GROSS_WITH_VAT") {
    return roundCents((input.costCents * 10000) / (10000 + input.vatRateBps));
  }
  return input.costCents;
}

/** Applica il ricarico al costo. Non applica l'arrotondamento a ,90 (vedi standardPriceCents/bulkPriceCents). */
function markedUp(netCost: number, marginBps: number): number {
  return roundCents((netCost * (10000 + marginBps)) / 10000);
}

/** Prezzo pubblico standard (fino alla soglia quantità) = costo × 1,30, arrotondato a ,90 se abilitato. */
export function standardPriceCents(input: ProductPricingInput, rules: PricingRules): number {
  const raw = markedUp(netCostCents(input), rules.marginBps);
  return rules.roundTo90Cents ? round90(raw) : raw;
}

/** Prezzo pubblico "quantità" (oltre la soglia) = costo × 1,20, arrotondato a ,90 se abilitato. */
export function bulkPriceCents(input: ProductPricingInput, rules: PricingRules): number {
  const raw = markedUp(netCostCents(input), rules.marginBulkBps);
  return rules.roundTo90Cents ? round90(raw) : raw;
}

/** Prezzo unitario effettivo per una riga carrello, in base alla quantità DI QUELLA riga. */
export function unitPriceCentsForQty(
  input: ProductPricingInput,
  rules: PricingRules,
  quantity: number
): number {
  return quantity > rules.bulkThresholdQty
    ? bulkPriceCents(input, rules)
    : standardPriceCents(input, rules);
}

export interface CartLineInput {
  product: ProductPricingInput;
  quantity: number;
}

export interface CartLineResult {
  unitPriceCents: number;
  standardUnitPriceCents: number;
  lineTotalCents: number;
  isBulkPricing: boolean;
}

export interface CartTotals {
  lines: CartLineResult[];
  subtotalCents: number;
  /** Quanto si sarebbe pagato senza lo sconto quantità — usato per mostrare il risparmio. */
  fullPriceSubtotalCents: number;
  bulkDiscountCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingRemainderCents: number;
  qualifiesForFreeShipping: boolean;
}

/**
 * Calcola i totali di un carrello. Questa funzione è l'UNICA fonte di verità per i prezzi:
 * va eseguita lato server a partire dai dati del database, non dai valori inviati dal client.
 */
export function computeCartTotals(
  lines: CartLineInput[],
  rules: PricingRules,
  shipping: ShippingRules
): CartTotals {
  const lineResults: CartLineResult[] = lines.map(({ product, quantity }) => {
    const standardUnitPriceCents = standardPriceCents(product, rules);
    const unitPriceCents = unitPriceCentsForQty(product, rules, quantity);
    return {
      unitPriceCents,
      standardUnitPriceCents,
      lineTotalCents: unitPriceCents * quantity,
      isBulkPricing: quantity > rules.bulkThresholdQty,
    };
  });

  const subtotalCents = lineResults.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const fullPriceSubtotalCents = lineResults.reduce(
    (sum, l, i) => sum + l.standardUnitPriceCents * lines[i].quantity,
    0
  );
  const bulkDiscountCents = fullPriceSubtotalCents - subtotalCents;

  const hasItems = lines.length > 0;
  const qualifiesForFreeShipping = subtotalCents >= shipping.freeShippingThresholdCents;
  const shippingCents = !hasItems ? 0 : qualifiesForFreeShipping ? 0 : shipping.standardShippingFeeCents;

  return {
    lines: lineResults,
    subtotalCents,
    fullPriceSubtotalCents,
    bulkDiscountCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingRemainderCents: Math.max(0, shipping.freeShippingThresholdCents - subtotalCents),
    qualifiesForFreeShipping,
  };
}

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}
