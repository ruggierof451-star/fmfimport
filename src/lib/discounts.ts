import { prisma } from "@/lib/prisma";

export interface DiscountValidation {
  ok: boolean;
  error?: string;
  code?: string;
  percentOffBps?: number;
}

/**
 * Valida un codice sconto lato server (unica fonte di verità, mai fidarsi di un
 * percentOffBps inviato dal client). Confronto case-insensitive: il codice è sempre
 * salvato in maiuscolo.
 */
export async function validateDiscountCode(rawCode: string | null | undefined): Promise<DiscountValidation> {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return { ok: false };

  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row) return { ok: false, error: "Codice sconto non valido." };
  if (!row.active) return { ok: false, error: "Codice sconto non più attivo." };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { ok: false, error: "Codice sconto scaduto." };
  if (row.maxUses != null && row.usedCount >= row.maxUses) return { ok: false, error: "Codice sconto esaurito." };

  return { ok: true, code: row.code, percentOffBps: row.percentOffBps };
}

/** Incrementa il contatore utilizzi dopo un ordine andato a buon fine con questo codice. */
export async function recordDiscountCodeUsage(code: string): Promise<void> {
  await prisma.discountCode.update({ where: { code }, data: { usedCount: { increment: 1 } } }).catch(() => {});
}
