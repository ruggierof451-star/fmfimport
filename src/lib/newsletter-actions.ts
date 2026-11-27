"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendNewsletterConfirmEmail } from "@/lib/email";
import { INTEREST_KEYS, syncContactSafely, type InterestKey } from "@/lib/marketing";
import { absoluteUrl } from "@/lib/site";

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Inserisci un'email valida.").max(200),
  interests: z.array(z.enum(INTEREST_KEYS as [InterestKey, ...InterestKey[]])).max(INTEREST_KEYS.length).default([]),
  consent: z.literal(true, { message: "Serve il consenso per iscriverti." }),
  // campo nascosto anti-bot: una persona non lo compila mai
  website: z.string().max(0).optional(),
});

const RESEND_CONFIRM_AFTER_MS = 10 * 60_000;

/**
 * Iscrizione alla newsletter dal modulo del sito (anche senza account). Doppio consenso:
 * si salva l'iscrizione in attesa e si manda un link di conferma; nessuna email di
 * marketing parte finché la persona non conferma.
 */
export async function subscribeNewsletterAction(input: z.input<typeof subscribeSchema>): Promise<{ ok: boolean; error?: string; message?: string }> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    // il bot che compila il campo nascosto riceve una risposta "riuscita" ma non succede nulla
    if (input.website) return { ok: true, message: "Controlla la tua email per confermare l'iscrizione." };
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const { email, interests } = parsed.data;

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === "CONFIRMED") {
    if (interests.length) {
      const merged = [...new Set([...existing.interests, ...interests])];
      await prisma.newsletterSubscriber.update({ where: { email }, data: { interests: merged } });
      await syncContactSafely(email);
    }
    return { ok: true, message: "Sei già iscritto: abbiamo aggiornato i tuoi interessi." };
  }
  if (existing?.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < RESEND_CONFIRM_AFTER_MS) {
    return { ok: true, message: "Ti abbiamo già mandato il link di conferma: controlla anche nello spam." };
  }

  const confirmToken = randomBytes(24).toString("base64url");
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, interests, confirmToken, confirmSentAt: new Date() },
    update: { interests, confirmToken, confirmSentAt: new Date(), status: "PENDING", unsubscribedAt: null },
  });
  await sendNewsletterConfirmEmail(email, absoluteUrl(`/newsletter/conferma/${confirmToken}`));
  return { ok: true, message: "Quasi fatto: ti abbiamo mandato un'email, clicca sul link per confermare l'iscrizione." };
}

/** Conferma dal link ricevuto via email (pulsante nella pagina, non al semplice caricamento). */
export async function confirmNewsletterAction(input: { token: string }): Promise<{ ok: boolean; error?: string }> {
  const token = String(input.token ?? "");
  if (!token) return { ok: false, error: "Link non valido." };
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { confirmToken: token } });
  if (!sub) return { ok: false, error: "Link non valido o scaduto. Iscriviti di nuovo dal sito." };
  if (sub.status !== "CONFIRMED") {
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { status: "CONFIRMED", confirmedAt: new Date(), unsubscribedAt: null, marketingSyncedAt: null },
    });
  }
  await syncContactSafely(sub.email);
  return { ok: true };
}
