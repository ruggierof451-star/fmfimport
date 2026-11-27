"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  code: z.string().min(2, "Il codice deve avere almeno 2 caratteri.").max(40),
  percentOff: z.number().min(0.01, "Lo sconto deve essere maggiore di 0.").max(100, "Lo sconto non può superare il 100%."),
  maxUses: z.number().int().min(1).nullable(),
  maxUsesPerUser: z.number().int().min(1).nullable(),
  expiresAt: z.string().nullable(), // data ISO (yyyy-mm-dd) o null
});

export async function createDiscountCodeAction(
  input: z.infer<typeof createSchema>
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const data = parsed.data;
  const code = data.code.trim().toUpperCase();

  const existing = await prisma.discountCode.findUnique({ where: { code } });
  if (existing) return { ok: false, error: "Esiste già un codice sconto con questo nome." };

  await prisma.discountCode.create({
    data: {
      code,
      percentOffBps: Math.round(data.percentOff * 100),
      maxUses: data.maxUses,
      maxUsesPerUser: data.maxUsesPerUser,
      expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T23:59:59`) : null,
      createdBy: admin.email,
    },
  });

  revalidatePath("/admin/sconti");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string(),
  percentOff: z.number().min(0.01, "Lo sconto deve essere maggiore di 0.").max(100, "Lo sconto non può superare il 100%."),
  maxUses: z.number().int().min(1).nullable(),
  maxUsesPerUser: z.number().int().min(1).nullable(),
  expiresAt: z.string().nullable(),
  active: z.boolean(),
});

/**
 * Modifica un codice esistente. Il codice in sé non si cambia (chi ce l'ha lo sta già
 * usando): si cambiano sconto, limiti, scadenza e stato. Il contatore utilizzi resta.
 */
export async function updateDiscountCodeAction(input: z.infer<typeof updateSchema>): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const data = parsed.data;

  const existing = await prisma.discountCode.findUnique({ where: { id: data.id } });
  if (!existing) return { ok: false, error: "Codice sconto non trovato." };
  if (data.maxUses != null && data.maxUses < existing.usedCount) {
    return { ok: false, error: `Questo codice è già stato usato ${existing.usedCount} volte: il limite totale non può essere più basso.` };
  }

  await prisma.discountCode.update({
    where: { id: data.id },
    data: {
      percentOffBps: Math.round(data.percentOff * 100),
      maxUses: data.maxUses,
      maxUsesPerUser: data.maxUsesPerUser,
      expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T23:59:59`) : null,
      active: data.active,
    },
  });

  revalidatePath("/admin/sconti");
  return { ok: true };
}

export async function toggleDiscountCodeAction(input: { id: string; active: boolean }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.discountCode.update({ where: { id: input.id }, data: { active: input.active } });
  revalidatePath("/admin/sconti");
  return { ok: true };
}

export async function deleteDiscountCodeAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.discountCode.delete({ where: { id: input.id } });
  revalidatePath("/admin/sconti");
  return { ok: true };
}
