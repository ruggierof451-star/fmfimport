"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { MARKETING_FOOTER_HTML, marketingBaseHtml } from "@/lib/email";
import { INTEREST_KEYS, revokeMarketingConsent, SEGMENT_KEYS, segmentCounts, segmentLabel, type InterestKey, type SegmentKey } from "@/lib/marketing";
import {
  AUTOMATION_DEFAULTS,
  enqueueCampaign,
  isMarketingConfigured,
  MARKETING_FROM,
  processQueue,
  type AutomationKey,
} from "@/lib/marketing-engine";
import { ensureUnsubscribe, injectPreheader, isFullDocument, personalize } from "@/lib/marketing-render";
import { absoluteUrl } from "@/lib/site";

type Result = { ok: boolean; error?: string };

const campaignSchema = z.object({
  subject: z.string().trim().min(2, "Scrivi un oggetto.").max(150),
  previewText: z.string().trim().max(150, "Anteprima troppo lunga (max 150 caratteri).").optional().nullable(),
  bodyHtml: z.string().min(1, "Incolla l'HTML dell'email o scrivi il contenuto."),
  segmentKey: z.enum(SEGMENT_KEYS as [SegmentKey, ...SegmentKey[]]).default("all"),
});

function revalidateMarketing(id?: string) {
  revalidatePath("/admin/marketing");
  if (id) revalidatePath(`/admin/marketing/${id}`);
}

// ---------------------------------------------------------------------------
// Campagne

export async function createMarketingCampaignAction(input: z.input<typeof campaignSchema>): Promise<Result & { id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const created = await prisma.marketingCampaign.create({
    data: { ...parsed.data, previewText: parsed.data.previewText || null, createdBy: admin.email },
  });
  revalidateMarketing();
  return { ok: true, id: created.id };
}

export async function updateMarketingCampaignAction(input: { id: string } & z.input<typeof campaignSchema>): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const existing = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Campagna non trovata." };
  if (existing.status !== "DRAFT") return { ok: false, error: "Si possono modificare solo le bozze." };
  await prisma.marketingCampaign.update({ where: { id: input.id }, data: { ...parsed.data, previewText: parsed.data.previewText || null } });
  revalidateMarketing(input.id);
  return { ok: true };
}

export async function deleteMarketingCampaignAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const existing = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Campagna non trovata." };
  if (existing.status !== "DRAFT" && existing.status !== "CANCELED") {
    return { ok: false, error: "Una campagna inviata, in invio o programmata non si può eliminare." };
  }
  const sent = await prisma.marketingSend.count({ where: { campaignId: existing.id, status: "SENT" } });
  if (sent) return { ok: false, error: "Questa campagna è già arrivata ad alcuni iscritti: resta come storico." };
  await prisma.marketingCampaign.delete({ where: { id: input.id } });
  revalidateMarketing();
  return { ok: true };
}

/** HTML di un'email di prova: come quella vera ma senza tracciamento. */
function testHtml(subject: string, previewText: string | null, bodyHtml: string, firstName: string | null, email: string) {
  let html = marketingBaseHtml({ subject, previewText, bodyHtml });
  if (isFullDocument(bodyHtml)) html = injectPreheader(html, previewText);
  html = personalize(html, { firstName, email });
  return ensureUnsubscribe(html, absoluteUrl("/"), MARKETING_FOOTER_HTML);
}

async function sendTest(to: string, subject: string, html: string): Promise<Result> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY non configurata." };
  const res = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: MARKETING_FROM, to, subject: `[PROVA] ${subject}`, html });
  return res.error ? { ok: false, error: `Invio di prova non riuscito: ${res.error.message}` } : { ok: true };
}

export async function sendTestMarketingEmailAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c) return { ok: false, error: "Campagna non trovata." };
  const firstName = admin.name?.split(" ")[0] ?? null;
  return sendTest(admin.email, personalize(c.subject, { firstName, email: admin.email }), testHtml(c.subject, c.previewText, c.bodyHtml, firstName, admin.email));
}

/**
 * Avvia la campagna: subito (scheduledAt assente) o all'orario scelto. I destinatari vanno
 * in coda e partono entro il limite giornaliero; il primo blocco parte subito.
 */
export async function sendMarketingCampaignAction(input: { id: string; scheduledAt?: string | null }): Promise<Result & { queued?: number; sent?: number }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (!isMarketingConfigured()) return { ok: false, error: "RESEND_API_KEY non configurata." };

  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c) return { ok: false, error: "Campagna non trovata." };
  if (c.status !== "DRAFT") return { ok: false, error: "Questa campagna è già stata avviata." };

  const segmentKey = (SEGMENT_KEYS as string[]).includes(c.segmentKey) ? (c.segmentKey as SegmentKey) : "all";
  const counts = await segmentCounts();
  if (counts[segmentKey] === 0) return { ok: false, error: `Nessun iscritto nel gruppo "${segmentLabel(segmentKey)}".` };

  if (input.scheduledAt) {
    const when = new Date(input.scheduledAt);
    if (Number.isNaN(when.getTime())) return { ok: false, error: "Data di invio non valida." };
    if (when.getTime() < Date.now() + 5 * 60_000) return { ok: false, error: "Programma l'invio almeno 5 minuti nel futuro." };
    if (when.getTime() > Date.now() + 90 * 24 * 3_600_000) return { ok: false, error: "Si può programmare al massimo 90 giorni avanti." };
    const locked = await prisma.marketingCampaign.updateMany({ where: { id: c.id, status: "DRAFT" }, data: { status: "SCHEDULED", scheduledAt: when } });
    if (!locked.count) return { ok: false, error: "Questa campagna è già stata avviata." };
    revalidateMarketing(c.id);
    return { ok: true };
  }

  const locked = await prisma.marketingCampaign.updateMany({ where: { id: c.id, status: "DRAFT" }, data: { status: "SENDING", sentAt: new Date(), scheduledAt: null } });
  if (!locked.count) return { ok: false, error: "Questa campagna è già stata avviata." };
  const queued = await enqueueCampaign(c.id);
  const run = await processQueue();
  revalidateMarketing(c.id);
  return { ok: true, queued, sent: run.sent };
}

/** Annulla una campagna programmata o ferma quella in invio (chi l'ha già ricevuta resta). */
export async function cancelMarketingCampaignAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c) return { ok: false, error: "Campagna non trovata." };
  if (c.status !== "SCHEDULED" && c.status !== "SENDING") return { ok: false, error: "Si possono annullare solo campagne programmate o in invio." };
  await prisma.$transaction([
    prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "CANCELED" } }),
    prisma.marketingSend.updateMany({ where: { campaignId: c.id, status: "QUEUED" }, data: { status: "SKIPPED", error: "Campagna annullata" } }),
  ]);
  revalidateMarketing(c.id);
  return { ok: true };
}

/** Riporta in bozza una campagna annullata: chi l'ha già ricevuta non la riceverà di nuovo. */
export async function reopenMarketingCampaignAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c || c.status !== "CANCELED") return { ok: false, error: "Solo una campagna annullata può tornare in bozza." };
  await prisma.$transaction([
    prisma.marketingSend.deleteMany({ where: { campaignId: c.id, status: { in: ["QUEUED", "SKIPPED", "FAILED"] } } }),
    prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "DRAFT", scheduledAt: null } }),
  ]);
  revalidateMarketing(c.id);
  return { ok: true };
}

/** Rimette in coda gli invii falliti di una campagna. */
export async function retryFailedSendsAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c) return { ok: false, error: "Campagna non trovata." };
  const n = await prisma.marketingSend.updateMany({ where: { campaignId: c.id, status: "FAILED" }, data: { status: "QUEUED", error: null } });
  if (n.count && c.status === "SENT") await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "SENDING" } });
  await processQueue();
  revalidateMarketing(c.id);
  return { ok: true };
}

/** Lavora subito la coda (sempre entro il limite giornaliero). */
export async function processMarketingQueueAction(): Promise<Result & { sent?: number; budgetLeft?: number }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const r = await processQueue();
  if (r.busy) return { ok: false, error: "Un invio è già in corso, riprova tra qualche minuto." };
  revalidateMarketing();
  return { ok: true, sent: r.sent, budgetLeft: r.budgetLeft };
}

// ---------------------------------------------------------------------------
// Automazioni

const automationSchema = z.object({
  key: z.enum(["welcome", "abandoned_order"]),
  enabled: z.boolean(),
  subject: z.string().trim().min(2, "Scrivi un oggetto.").max(150),
  bodyHtml: z.string().min(1, "Scrivi il contenuto."),
  delayHours: z.number().int().min(0).max(72),
});

export async function saveAutomationAction(input: z.input<typeof automationSchema>): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const parsed = automationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const { key, ...data } = parsed.data;
  await prisma.marketingAutomation.upsert({ where: { key }, create: { key, ...data }, update: data });
  revalidatePath("/admin/marketing/automazioni");
  return { ok: true };
}

export async function resetAutomationAction(input: { key: AutomationKey }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const d = AUTOMATION_DEFAULTS[input.key];
  if (!d) return { ok: false, error: "Automazione sconosciuta." };
  await prisma.marketingAutomation.update({ where: { key: input.key }, data: { subject: d.subject, bodyHtml: d.bodyHtml, delayHours: d.delayHours } });
  revalidatePath("/admin/marketing/automazioni");
  return { ok: true };
}

export async function testAutomationAction(input: { key: AutomationKey }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const a = await prisma.marketingAutomation.findUnique({ where: { key: input.key } });
  if (!a) return { ok: false, error: "Salva prima l'automazione." };
  const firstName = admin.name?.split(" ")[0] ?? null;
  const body = a.bodyHtml
    .replace(/\{\{\s*numero_ordine\s*\}\}/gi, "FMF-PROVA")
    .replace(/\{\{\s*prodotti\s*\}\}/gi, "<ul><li>Prodotto di esempio × 1</li></ul>");
  return sendTest(admin.email, personalize(a.subject, { firstName, email: admin.email }), testHtml(a.subject, null, body, firstName, admin.email));
}

// ---------------------------------------------------------------------------
// Contatti

const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Aggiunge o importa contatti come iscritti confermati. L'admin dichiara di avere il loro
 * consenso (es. iscritti raccolti in negozio o ai live): senza consenso non si possono
 * mandare email promozionali.
 */
export async function importContactsAction(input: { csv: string; consent: boolean }): Promise<Result & { added?: number; updated?: number; invalid?: string[] }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (!input.consent) return { ok: false, error: "Conferma di avere il consenso di questi contatti." };

  const lines = input.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, error: "Incolla almeno un indirizzo." };
  if (lines.length > 2000) return { ok: false, error: "Massimo 2.000 righe per volta." };
  let added = 0;
  let updated = 0;
  const invalid: string[] = [];
  for (const [i, line] of lines.entries()) {
    const cells = line.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const parsedEmail = emailSchema.safeParse(cells[0]);
    if (!parsedEmail.success) {
      if (i === 0 && /mail/i.test(cells[0] ?? "")) continue; // riga di intestazione
      invalid.push(cells[0] || `riga ${i + 1}`);
      continue;
    }
    const email = parsedEmail.data;
    const firstName = cells[1]?.slice(0, 60) || null;
    const interests = (cells.slice(2).join(" ").toLowerCase().match(/pokemon|pokémon|one ?piece|yu-?gi-?oh|dragon ?ball/g) ?? []).map((t) =>
      t.startsWith("pok") ? "pokemon" : t.startsWith("one") ? "onepiece" : t.startsWith("yu") ? "yugioh" : "dragonball"
    ) as InterestKey[];
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: {
          status: "CONFIRMED",
          confirmedAt: existing.confirmedAt ?? new Date(),
          unsubscribedAt: null,
          firstName: firstName ?? existing.firstName,
          interests: [...new Set([...existing.interests, ...interests])],
        },
      });
      updated += 1;
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email,
          firstName,
          interests: [...new Set(interests)],
          status: "CONFIRMED",
          confirmedAt: new Date(),
          source: "import",
          confirmToken: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
        },
      });
      added += 1;
    }
  }
  revalidatePath("/admin/marketing/contatti");
  revalidateMarketing();
  return { ok: true, added, updated, invalid: invalid.slice(0, 20) };
}

export async function removeContactAction(input: { email: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) return { ok: false, error: "Email non valida." };
  await revokeMarketingConsent(parsed.data);
  revalidatePath("/admin/marketing/contatti");
  revalidateMarketing();
  return { ok: true };
}

export async function updateContactInterestsAction(input: { email: string; interests: string[] }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) return { ok: false, error: "Email non valida." };
  const interests = input.interests.filter((i): i is InterestKey => (INTEREST_KEYS as string[]).includes(i));
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { email: parsed.data } });
  if (!sub) return { ok: false, error: "Gli interessi si modificano solo per gli iscritti alla newsletter." };
  await prisma.newsletterSubscriber.update({ where: { email: parsed.data }, data: { interests } });
  revalidatePath("/admin/marketing/contatti");
  return { ok: true };
}
