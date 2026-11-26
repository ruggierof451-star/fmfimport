import { prisma } from "@/lib/prisma";
import type { ShippingRules } from "@/lib/pricing";

/**
 * Le impostazioni generali sono una riga singola (id=1) modificabile dall'area admin.
 * Se non esiste ancora (primo avvio), viene creata con i valori di default del brief.
 */
export async function getPricingSettings() {
  const existing = await prisma.pricingSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.pricingSettings.create({ data: { id: 1 } });
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
