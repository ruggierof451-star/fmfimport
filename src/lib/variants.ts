import { unitPriceCentsFor, type PackagingChoice, type PriceableProduct } from "./pricing";
import { isOutOfStock, maxOrderableQty } from "./stock";

/**
 * Varianti di prodotto (es. box "Rivali Predestinati" → "Busta singola").
 *
 * Regole, condivise da carrello (quote) e checkout così non possono divergere:
 * - il prodotto principale resta acquistabile con il suo prezzo e le sue regole (prezzo
 *   rivenditore, confezione JP, magazzino);
 * - una variante ha SOLO un prezzo pubblico IVA inclusa: niente prezzo rivenditore (i
 *   rivenditori pagano il prezzo pubblico della variante), niente scelta confezione e
 *   niente magazzino proprio (sempre ordinabile finché il prodotto è pubblicato, anche se
 *   il prodotto principale è esaurito).
 */

export interface VariantLike {
  id: string;
  name: string;
  priceCents: number;
}

export const MAX_VARIANT_QTY = 99;

export function findVariant<V extends VariantLike>(variants: V[], variantId: string | null | undefined): V | null {
  if (!variantId) return null;
  return variants.find((v) => v.id === variantId) ?? null;
}

export function lineUnitPriceCents(
  product: PriceableProduct,
  variant: VariantLike | null,
  isReseller: boolean,
  packaging: PackagingChoice
): number {
  if (variant) return variant.priceCents;
  return unitPriceCentsFor(product, isReseller, packaging);
}

/** Disponibilità di una riga: le varianti non hanno magazzino proprio. */
export function lineIsOutOfStock(stockQty: number | null, variant: VariantLike | null): boolean {
  return variant ? false : isOutOfStock(stockQty);
}

export function lineMaxQty(stockQty: number | null, variant: VariantLike | null): number {
  return variant ? MAX_VARIANT_QTY : maxOrderableQty(stockQty);
}

/** Nome mostrato in carrello, email e storico ordini: "Prodotto — Variante". */
export function lineDisplayName(productName: string, variant: VariantLike | null): string {
  return variant ? `${productName} — ${variant.name}` : productName;
}
