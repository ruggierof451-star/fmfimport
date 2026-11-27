import { prisma } from "@/lib/prisma";

export interface DiscountValidation {
  ok: boolean;
  error?: string;
  code?: string;
  percentOffBps?: number;
}

export interface DiscountIdentity {
  userId?: string | null;
  email?: string | null;
}

/**
 * Valida un codice sconto lato server (unica fonte di verità, mai fidarsi di un
 * percentOffBps inviato dal client). Confronto case-insensitive: il codice è sempre
 * salvato in maiuscolo.
 *
 * Il limite per profilo (maxUsesPerUser) si verifica solo se si conosce già l'identità
 * del cliente (email o account): finché non la si conosce (es. anteprima carrello prima
 * di inserire l'email) il controllo per-profilo viene saltato e rimandato al checkout,
 * che è comunque l'unico punto in cui l'ordine viene davvero creato.
 */
export async function validateDiscountCode(
  rawCode: string | null | undefined,
  identity?: DiscountIdentity
): Promise<DiscountValidation> {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return { ok: false };

  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row) return { ok: false, error: "Codice sconto non valido." };
  if (!row.active) return { ok: false, error: "Codice sconto non più attivo." };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { ok: false, error: "Codice sconto scaduto." };
  if (row.maxUses != null && row.usedCount >= row.maxUses) return { ok: false, error: "Codice sconto esaurito." };

  if (row.maxUsesPerUser != null && (identity?.userId || identity?.email)) {
    const usedByThisUser = await prisma.order.count({
      where: {
        couponCode: row.code,
        paymentStatus: "PAID",
        OR: [
          ...(identity.userId ? [{ userId: identity.userId }] : []),
          ...(identity.email ? [{ guestEmail: identity.email }] : []),
        ],
      },
    });
    if (usedByThisUser >= row.maxUsesPerUser) {
      return { ok: false, error: "Hai già usato questo codice sconto il numero massimo di volte consentito." };
    }
  }

  return { ok: true, code: row.code, percentOffBps: row.percentOffBps };
}

/** Incrementa il contatore utilizzi quando un ordine con questo codice viene pagato davvero. */
export async function recordDiscountCodeUsage(code: string): Promise<void> {
  await prisma.discountCode.update({ where: { code }, data: { usedCount: { increment: 1 } } }).catch(() => {});
}
