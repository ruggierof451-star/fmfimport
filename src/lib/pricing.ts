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

export interface PriceableProduct {
  priceCents: number | null;
  resellerPriceCents: number | null;
}

/** Prezzo unitario da esporre per questo cliente: listino rivenditore se approvato e impostato, altrimenti il prezzo pubblico. */
export function unitPriceCentsFor(product: PriceableProduct, isReseller: boolean): number {
  if (isReseller && product.resellerPriceCents != null) return product.resellerPriceCents;
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
  shippingCents: number;
  totalCents: number;
  freeShippingRemainderCents: number;
  qualifiesForFreeShipping: boolean;
}

/**
 * Calcola i totali di un carrello. Questa funzione è l'UNICA fonte di verità per i prezzi:
 * va eseguita lato server a partire dai dati del database (prezzo + ruolo utente), non
 * dai valori inviati dal client.
 */
export function computeCartTotals(lines: CartLineInput[], shipping: ShippingRules): CartTotals {
  const lineResults: CartLineResult[] = lines.map(({ unitPriceCents, quantity }) => ({
    unitPriceCents,
    lineTotalCents: unitPriceCents * quantity,
  }));

  const subtotalCents = lineResults.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const hasItems = lines.length > 0;
  const qualifiesForFreeShipping = subtotalCents >= shipping.freeShippingThresholdCents;
  const shippingCents = !hasItems ? 0 : qualifiesForFreeShipping ? 0 : shipping.standardShippingFeeCents;

  return {
    lines: lineResults,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
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
