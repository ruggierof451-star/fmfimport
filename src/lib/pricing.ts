/**
 * Motore prezzi — FMF Cards.
 *
 * Regole:
 *  - Ogni prodotto ha UN prezzo pubblico unico, impostato a mano dall'admin
 *    (Product.priceCents): nessun calcolo automatico da costo o margine, nessuna
 *    fascia quantità. Tutti i clienti vedono lo stesso prezzo.
 *  - I rivenditori approvati (ruolo RESELLER) possono avere un prezzo dedicato
 *    (Product.resellerPriceCents), anche questo impostato a mano dall'admin. Se non
 *    è impostato, il rivenditore vede il prezzo pubblico come chiunque altro.
 *  - Tutti i prezzi esposti sul sito (catalogo, carrello, checkout) sono SEMPRE IVA
 *    INCLUSA: richiedere la fattura con partita IVA non cambia il totale, la fattura
 *    riporta semplicemente l'IVA già inclusa nel prezzo.
 *  - Spedizione gratuita sopra una soglia sul subtotale.
 *
 * Tutti gli importi sono interi in centesimi. Le percentuali (solo per l'IVA di
 * fattura) sono interi in "bps" (basis points: 2200 = 22,00%).
 * Non usare mai Number in virgola mobile per importi: niente arrotondamenti a sorpresa.
 */

export type PackagingChoice = "SEALED" | "NO_WRAP" | "DAMAGED";

export interface ResellerTier {
  minQty: number;
  priceCents: number;
}

export interface PriceableProduct {
  priceCents: number | null;
  resellerPriceCents: number | null;
  noWrapPriceCents?: number | null;
  damagedPriceCents?: number | null;
  resellerTiers?: ResellerTier[];
}

/** Scaglione rivenditore applicabile: quello con la soglia più alta raggiunta da quantity. */
export function resellerTierFor(tiers: ResellerTier[] | undefined, quantity: number): ResellerTier | null {
  if (!tiers?.length) return null;
  let best: ResellerTier | null = null;
  for (const t of tiers) {
    if (t.minQty <= quantity && (!best || t.minQty > best.minQty)) best = t;
  }
  return best;
}

/**
 * Prezzo unitario da esporre per questo cliente. Il listino rivenditore (se approvato e
 * impostato) vale sempre, indipendentemente dalla confezione scelta: prima lo scaglione
 * per quantità raggiunto, poi il prezzo rivenditore base. Altrimenti: prezzo pubblico
 * "con pellicola" di default, oppure il prezzo della confezione scelta se impostato per
 * quel prodotto (solo booster box JP, vedi isJpBoosterBox); se quella confezione non ha un
 * prezzo proprio, si ricade sul prezzo pubblico standard.
 */
export function unitPriceCentsFor(
  product: PriceableProduct,
  isReseller: boolean,
  packaging: PackagingChoice = "SEALED",
  quantity = 1
): number {
  if (isReseller) {
    const tier = resellerTierFor(product.resellerTiers, quantity);
    if (tier) return tier.priceCents;
    if (product.resellerPriceCents != null) return product.resellerPriceCents;
  }
  if (packaging === "NO_WRAP" && product.noWrapPriceCents != null) return product.noWrapPriceCents;
  if (packaging === "DAMAGED" && product.damagedPriceCents != null) return product.damagedPriceCents;
  return product.priceCents ?? 0;
}

export interface ShippingRules {
  freeShippingThresholdCents: number;
  standardShippingFeeCents: number;
}

export interface CartLineInput {
  unitPriceCents: number;
  quantity: number;
}

export interface CartLineResult {
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface CartTotals {
  lines: CartLineResult[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingRemainderCents: number;
  qualifiesForFreeShipping: boolean;
}

/**
 * Calcola i totali di un carrello. Questa funzione è l'UNICA fonte di verità per i prezzi:
 * va eseguita lato server a partire dai dati del database (prezzo + ruolo utente + codice
 * sconto validato), non dai valori inviati dal client.
 *
 * discountPercentOffBps: sconto percentuale sul subtotale (es. 500 = 5,00%), 0 se nessun
 * codice sconto valido è applicato. La soglia di spedizione gratuita si valuta sul
 * subtotale PRIMA dello sconto.
 */
export function computeCartTotals(lines: CartLineInput[], shipping: ShippingRules, discountPercentOffBps = 0): CartTotals {
  const lineResults: CartLineResult[] = lines.map(({ unitPriceCents, quantity }) => ({
    unitPriceCents,
    lineTotalCents: unitPriceCents * quantity,
  }));

  const subtotalCents = lineResults.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const discountCents = Math.round((subtotalCents * discountPercentOffBps) / 10000);
  const hasItems = lines.length > 0;
  const qualifiesForFreeShipping = subtotalCents >= shipping.freeShippingThresholdCents;
  const shippingCents = !hasItems ? 0 : qualifiesForFreeShipping ? 0 : shipping.standardShippingFeeCents;

  return {
    lines: lineResults,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
    freeShippingRemainderCents: Math.max(0, shipping.freeShippingThresholdCents - subtotalCents),
    qualifiesForFreeShipping,
  };
}

/** Scorpora la quota IVA già inclusa in un importo, per mostrarla in fattura (non cambia il totale). */
export function extractVatCents(grossCents: number, publicVatRateBps: number): number {
  const net = Math.round((grossCents * 10000) / (10000 + publicVatRateBps));
  return grossCents - net;
}

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}
