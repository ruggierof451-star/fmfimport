import { prisma } from "@/lib/prisma";
import type { PricingRules, ShippingRules } from "@/lib/pricing";

/**
 * Le impostazioni di pricing sono una riga singola (id=1) modificabile dall'area admin.
 * Se non esiste ancora (primo avvio), viene creata con i valori di default del brief.
 */
export async function getPricingSettings() {
  const existing = await prisma.pricingSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.pricingSettings.create({ data: { id: 1 } });
}

export function toPricingRules(settings: {
  marginBps: number;
  marginBulkBps: number;
  bulkThresholdQty: number;
  roundTo90Cents: boolean;
  invoiceVatRateBps: number;
}): PricingRules {
  return {
    marginBps: settings.marginBps,
    marginBulkBps: settings.marginBulkBps,
    bulkThresholdQty: settings.bulkThresholdQty,
    roundTo90Cents: settings.roundTo90Cents,
    publicVatRateBps: settings.invoiceVatRateBps,
  };
}

export function toShippingRules(settings: {
  freeShippingThresholdCents: number;
  standardShippingFeeCents: number;
}): ShippingRules {
  return {
    freeShippingThresholdCents: settings.freeShippingThresholdCents,
    standardShippingFeeCents: settings.standardShippingFeeCents,
  };
}
