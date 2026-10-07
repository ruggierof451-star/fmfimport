"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1, "Il nome è obbligatorio."),
  street: z.string().min(3, "Inserisci indirizzo e numero civico."),
  postalCode: z.string().min(3, "CAP non valido."),
  city: z.string().min(1, "La città è obbligatoria."),
  province: z.string().min(1, "La provincia è obbligatoria."),
  country: z.string().default("IT"),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export async function createAddressAction(input: AddressInput): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Devi essere connesso." };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const data = parsed.data;

  const existingCount = await prisma.address.count({ where: { userId: user.id } });

  await prisma.$transaction(async (tx) => {
    if (data.isDefault || existingCount === 0) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    await tx.address.create({
      data: {
        userId: user.id,
        label: data.label || null,
        fullName: data.fullName,
        street: data.street,
        postalCode: data.postalCode,
        city: data.city,
        province: data.province,
        country: data.country,
        phone: data.phone || null,
        isDefault: data.isDefault || existingCount === 0,
      },
    });
  });

  revalidatePath("/account");
  return { ok: true };
}

export async function deleteAddressAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Devi essere connesso." };

  const address = await prisma.address.findUnique({ where: { id: input.id } });
  if (!address || address.userId !== user.id) return { ok: false, error: "Indirizzo non trovato." };

  await prisma.address.delete({ where: { id: input.id } });
  revalidatePath("/account");
  return { ok: true };
}

export async function setDefaultAddressAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Devi essere connesso." };

  const address = await prisma.address.findUnique({ where: { id: input.id } });
  if (!address || address.userId !== user.id) return { ok: false, error: "Indirizzo non trovato." };

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: input.id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/account");
  return { ok: true };
}

const billingSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio.").optional(),
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  sdiCode: z.string().optional(),
});

export async function updateBillingInfoAction(
  input: z.infer<typeof billingSchema>
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Devi essere connesso." };

  const parsed = billingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      vatNumber: parsed.data.vatNumber || null,
      sdiCode: parsed.data.sdiCode || null,
    },
  });

  revalidatePath("/account");
  return { ok: true };
}
