"use server";

import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { after } from "next/server";
import { enqueueAutomation, maybeProcessQueue } from "@/lib/marketing-engine";
import { rateLimit, rateLimitReset, clientIp, tooManyAttemptsMessage } from "@/lib/rate-limit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 ora

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

const registerSchema = z.object({
  name: z.string().min(1, "Inserisci il tuo nome."),
  email: z.string().email("Inserisci un'email valida."),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
  marketingOptIn: z.boolean().optional(),
});

export async function registerAction(
  input: { name: string; email: string; password: string; marketingOptIn?: boolean }
): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const email = parsed.data.email.toLowerCase().trim();

  // Anti abuso: massimo 10 registrazioni ogni ora dallo stesso indirizzo IP.
  const okIp = await rateLimit(`register:ip:${await clientIp()}`, 10, 60 * 60 * 1000);
  if (!okIp.ok) return { ok: false, error: tooManyAttemptsMessage(okIp.retryAfterSec) };

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
      marketingOptIn: parsed.data.marketingOptIn ?? false,
    },
  });

  await createSession({ userId: user.id, role: user.role, email: user.email });
  // email di benvenuto all'account (modello "account_welcome", modificabile da Admin → Email)
  await sendWelcomeEmail(user.email, user.name?.split(" ")[0] ?? "").catch((err) => console.error("[registrazione] email benvenuto fallita:", err));
  // email automatica di marketing di benvenuto (se attiva) a chi si registra con il consenso marketing
  if (user.marketingOptIn) {
    after(async () => {
      await enqueueAutomation({ key: "welcome", email: user.email, firstName: user.name?.split(" ")[0] ?? null });
      await maybeProcessQueue();
    });
  }
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

  // Anti brute force: massimo 10 tentativi per email e 20 per indirizzo IP ogni 15 minuti.
  const ip = await clientIp();
  const byEmail = await rateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
  const byIp = await rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!byEmail.ok || !byIp.ok) {
    return { ok: false, error: tooManyAttemptsMessage(Math.max(byEmail.retryAfterSec, byIp.retryAfterSec)) };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Email o password non corrette." };
  }

  // Accesso riuscito: azzera i contatori così un utente legittimo non resta limitato.
  await rateLimitReset(`login:email:${email}`);
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

const requestResetSchema = z.object({ email: z.string().email("Inserisci un'email valida.") });

export async function requestPasswordResetAction(
  input: { email: string }
): Promise<{ ok: boolean; error?: string; resetUrl?: string }> {
  const parsed = requestResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const email = parsed.data.email.toLowerCase().trim();

  // Anti abuso: massimo 5 richieste di reset ogni ora per IP e per email.
  const ip = await clientIp();
  const okIp = await rateLimit(`reset:ip:${ip}`, 5, 60 * 60 * 1000);
  const okEmail = await rateLimit(`reset:email:${email}`, 5, 60 * 60 * 1000);
  if (!okIp.ok || !okEmail.ok) {
    return { ok: false, error: tooManyAttemptsMessage(Math.max(okIp.retryAfterSec, okEmail.retryAfterSec)) };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Risposta identica che l'utente esista o no: non riveliamo quali email sono registrate.
  if (!user) return { ok: true };

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetPath = `/account/reimposta-password/${rawToken}`;
  const resetUrl = `${process.env.SITE_URL || "https://www.fmfcards.com"}${resetPath}`;
  const emailResult = await sendPasswordResetEmail(email, resetUrl);

  // Il link di reset NON viene mai mostrato a schermo in produzione: chiunque può chiedere
  // il reset di qualsiasi email, quindi esporlo permetterebbe di prendere il controllo di
  // un account altrui. Il ripiego a schermo resta solo in sviluppo, quando non c'è email.
  const showFallbackLink = !emailResult.ok && process.env.NODE_ENV !== "production";
  if (!emailResult.ok && process.env.NODE_ENV === "production") {
    console.error("[password-reset] invio email fallito: link non mostrato per sicurezza.");
  }
  return { ok: true, resetUrl: showFallbackLink ? resetPath : undefined };
}

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, "La nuova password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Le due password non coincidono.",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Il link non è valido o è scaduto. Richiedine uno nuovo." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true };
}
