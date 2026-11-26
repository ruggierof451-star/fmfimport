"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const resellerRequestSchema = z.object({
  companyName: z.string().min(1, "Indica la ragione sociale."),
  vatNumber: z.string().min(5, "Indica una partita IVA valida."),
  sdiCode: z.string().optional(),
  contactName: z.string().min(1, "Indica un referente."),
  email: z.string().email("Inserisci un'email valida."),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export type ResellerRequestInput = z.infer<typeof resellerRequestSchema>;

/**
 * Richiesta pubblica dalla pagina "Lavora con noi". Non crea account né sconti: resta
 * in attesa di valutazione manuale da parte di un admin (vedi /admin/rivenditori).
 */
export async function submitResellerRequestAction(input: ResellerRequestInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = resellerRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const data = parsed.data;

  await prisma.resellerRequest.create({
    data: {
      companyName: data.companyName.trim(),
      vatNumber: data.vatNumber.trim(),
      sdiCode: data.sdiCode?.trim() || null,
      contactName: data.contactName.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
      message: data.message?.trim() || null,
    },
  });

  return { ok: true };
}

export async function reviewResellerRequestAction(input: {
  id: string;
  status: "APPROVED" | "REJECTED";
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.resellerRequest.update({
    where: { id: input.id },
    data: {
      status: input.status,
      note: input.note?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy: admin.email,
    },
  });

  revalidatePath("/admin/rivenditori");
  return { ok: true };
}
