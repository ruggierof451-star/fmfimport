"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendNewsletterConfirmEmail } from "@/lib/email";
import { INTEREST_KEYS, revokeMarketingConsent, type InterestKey } from "@/lib/marketing";
import { enqueueAutomation, maybeProcessQueue } from "@/lib/marketing-engine";
import { after } from "next/server";
import { absoluteUrl } from "@/lib/site";

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Inserisci un'email valida.").max(200),
  firstName: z.string().trim().max(60).optional(),
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
  const firstName = parsed.data.firstName || null;

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === "CONFIRMED") {
    if (interests.length) {
      const merged = [...new Set([...existing.interests, ...interests])];
      await prisma.newsletterSubscriber.update({ where: { email }, data: { interests: merged, ...(firstName ? { firstName } : {}) } });
    }
    return { ok: true, message: "Sei già iscritto: abbiamo aggiornato i tuoi interessi." };
  }
  if (existing?.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < RESEND_CONFIRM_AFTER_MS) {
    return { ok: true, message: "Ti abbiamo già mandato il link di conferma: controlla anche nello spam." };
  }

  const confirmToken = randomBytes(24).toString("base64url");
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, firstName, interests, confirmToken, confirmSentAt: new Date() },
    update: { firstName, interests, confirmToken, confirmSentAt: new Date(), status: "PENDING", unsubscribedAt: null },
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
      data: { status: "CONFIRMED", confirmedAt: new Date(), unsubscribedAt: null },
    });
    // email di benvenuto (se l'automazione è attiva), una sola volta per indirizzo
    after(async () => {
      await enqueueAutomation({ key: "welcome", email: sub.email, firstName: sub.firstName });
      await maybeProcessQueue();
    });
  }
  return { ok: true };
}

/** Disiscrizione da un'email di marketing (id dell'invio come chiave, non indovinabile). */
export async function unsubscribeBySendId(sendId: string): Promise<boolean> {
  const send = await prisma.marketingSend.findUnique({ where: { id: String(sendId) }, select: { id: true, email: true } });
  if (!send) return false;
  await revokeMarketingConsent(send.email);
  await prisma.marketingSend.update({ where: { id: send.id }, data: { unsubscribedAt: new Date() } });
  return true;
}

export async function unsubscribeNewsletterAction(input: { sendId: string }): Promise<{ ok: boolean }> {
  return { ok: await unsubscribeBySendId(input.sendId) };
}
