"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

const registerSchema = z.object({
  name: z.string().min(1, "Inserisci il tuo nome."),
  email: z.string().email("Inserisci un'email valida."),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
});

export async function registerAction(input: { name: string; email: string; password: string }): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Esiste già un account con questa email." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash: await hashPassword(parsed.data.password),
      role: "CUSTOMER",
    },
  });

  await createSession({ userId: user.id, role: user.role, email: user.email });
  return { ok: true };
}

const loginSchema = z.object({
  email: z.string().email("Inserisci un'email valida."),
  password: z.string().min(1, "Inserisci la password."),
});

export async function loginAction(input: { email: string; password: string }): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Email o password non corrette." };
  }

  await createSession({ userId: user.id, role: user.role, email: user.email });
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Inserisci la password attuale."),
    newPassword: z.string().min(8, "La nuova password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Le due password non coincidono.",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Devi essere connesso." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) return { ok: false, error: "La password attuale non è corretta." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return { ok: true };
}
