/** stockQty null = disponibilità non tracciata (si assume disponibile); 0 = esaurito; >0 = quantità nota. */
export function isOutOfStock(stockQty: number | null): boolean {
  return stockQty === 0;
}

export function maxOrderableQty(stockQty: number | null): number {
  if (stockQty == null) return 99;
  return stockQty;
}

export function stockLabel(stockQty: number | null, isPreorder: boolean): string {
  if (isPreorder) return "Preordine";
  if (stockQty == null) return "Disponibile";
  if (stockQty === 0) return "Esaurito";
  if (stockQty <= 5) return `Solo ${stockQty} disponibili`;
  return `Disponibile · ${stockQty} pz`;
}

export function stockTone(stockQty: number | null, isPreorder: boolean): "ok" | "warn" | "err" {
  if (isPreorder) return "warn";
  if (stockQty === 0) return "err";
  if (stockQty != null && stockQty <= 5) return "warn";
  return "ok";
}
