"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  code: z.string().min(2, "Il codice deve avere almeno 2 caratteri.").max(40),
  percentOff: z.number().min(0.01, "Lo sconto deve essere maggiore di 0.").max(100, "Lo sconto non può superare il 100%."),
  maxUses: z.number().int().min(1).nullable(),
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
      expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T23:59:59`) : null,
      createdBy: admin.email,
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
