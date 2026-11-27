import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { computeAudience, countSegments, SEGMENTS, type AudienceMember, type SegmentKey } from "@/lib/marketing-audience";

/**
 * Email marketing tramite Resend (contatti, segmenti e Broadcasts).
 *
 * Fonte di verità del consenso è SEMPRE il nostro database:
 * - utenti registrati con marketingOptIn = true;
 * - iscritti alla newsletter dal sito con status CONFIRMED (doppia conferma).
 * Su Resend teniamo una copia dei soli contatti, divisi in segmenti calcolati qui
 * (interessi, clienti, rivenditori). Chi si disiscrive da un link Resend torna indietro
 * tramite webhook (/api/webhooks/resend) e perde il consenso anche qui.
 *
 * Le campagne partono come Broadcast di Resend verso un segmento: non consumano la quota
 * delle email transazionali (ordini, password) e Resend gestisce invio e disiscrizioni.
 */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
export const MARKETING_FROM = process.env.EMAIL_MARKETING_FROM || process.env.EMAIL_FROM || "FMF Cards <onboarding@resend.dev>";

export function isMarketingConfigured(): boolean {
  return resend != null;
}

function client(): Resend {
  if (!resend) throw new MarketingError("RESEND_API_KEY non configurata: impossibile parlare con Resend.");
  return resend;
}

export class MarketingError extends Error {}

// ---------------------------------------------------------------------------
// Segmenti

export {
  INTERESTS,
  INTEREST_KEYS,
  SEGMENTS,
  SEGMENT_KEYS,
  segmentLabel,
  type InterestKey,
  type SegmentKey,
  type AudienceMember,
} from "@/lib/marketing-audience";

/** Id Resend del segmento, creandolo al primo utilizzo (e cercandolo per nome se esiste già). */
async function ensureSegment(key: SegmentKey): Promise<string> {
  const saved = await prisma.marketingSegment.findUnique({ where: { key } });
  if (saved) return saved.resendSegmentId;
  const def = SEGMENTS.find((s) => s.key === key)!;

  const listed = await withRetry(() => client().segments.list());
  const existing = listed.data?.data.find((s) => s.name === def.name);
  let id = existing?.id;
  if (!id) {
    const created = await withRetry(() => client().segments.create({ name: def.name }));
    if (created.error || !created.data) throw new MarketingError(`Creazione segmento "${def.label}" non riuscita: ${created.error?.message ?? "errore sconosciuto"}`);
    id = created.data.id;
  }
  await prisma.marketingSegment.upsert({ where: { key }, create: { key, name: def.name, resendSegmentId: id }, update: { resendSegmentId: id } });
  return id;
}

// ---------------------------------------------------------------------------
// Pubblico (calcolato dal nostro database)

/** Pubblico con consenso (dal database) e relativi segmenti: vedi computeAudience. */
export async function buildAudience(onlyEmails?: string[]): Promise<Map<string, AudienceMember>> {
  const emailFilter = onlyEmails ? { in: onlyEmails.map((e) => e.toLowerCase()) } : undefined;
  const [users, subscribers, paidOrders] = await Promise.all([
    prisma.user.findMany({
      where: { marketingOptIn: true, ...(emailFilter ? { email: emailFilter } : {}) },
      select: { email: true, name: true, role: true },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { status: "CONFIRMED", ...(emailFilter ? { email: emailFilter } : {}) },
      select: { email: true, interests: true },
    }),
    prisma.order.findMany({
      where: {
        paymentStatus: "PAID",
        ...(emailFilter ? { OR: [{ guestEmail: emailFilter }, { user: { email: emailFilter } }] } : {}),
      },
      select: { guestEmail: true, user: { select: { email: true } }, items: { select: { product: { select: { game: true } } } } },
    }),
  ]);
  return computeAudience({
    users,
    subscribers,
    paidOrders: paidOrders.map((o) => ({
      email: o.user?.email ?? o.guestEmail,
      games: o.items.flatMap((it) => (it.product ? [it.product.game] : [])),
    })),
  });
}

export async function segmentCounts(): Promise<Record<SegmentKey, number>> {
  return countSegments(await buildAudience());
}

// ---------------------------------------------------------------------------
// Sincronizzazione contatti

// Resend limita il numero di richieste al secondo: piccola pausa tra le chiamate e un
// nuovo tentativo se la risposta è "troppe richieste".
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T extends { error?: { name?: string; message?: string } | null }>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fn();
    const name = res.error?.name ?? "";
    if (attempt < 3 && (name === "rate_limit_exceeded" || /rate limit|too many/i.test(res.error?.message ?? ""))) {
      await sleep(1100 * (attempt + 1));
      continue;
    }
    await sleep(550); // ~2 richieste al secondo, il limite predefinito di Resend
    return res;
  }
}

async function markSynced(email: string) {
  const now = new Date();
  await prisma.user.updateMany({ where: { email }, data: { marketingSyncedAt: now } });
  await prisma.newsletterSubscriber.updateMany({ where: { email }, data: { marketingSyncedAt: now } });
}

/**
 * Allinea su Resend un singolo indirizzo con quello che dice il nostro database:
 * con consenso → contatto attivo nei segmenti giusti; senza consenso → contatto
 * segnato come disiscritto (resta per lo storico, non riceve più campagne).
 */
export async function syncContact(rawEmail: string): Promise<void> {
  if (!resend) return;
  const email = rawEmail.toLowerCase().trim();
  const member = (await buildAudience([email])).get(email);

  const found = await withRetry(() => client().contacts.get({ email }));
  const exists = !!found.data && !found.error;

  if (!member) {
    if (exists && !found.data!.unsubscribed) {
      const res = await withRetry(() => client().contacts.update({ email, unsubscribed: true }));
      if (res.error) throw new MarketingError(`Aggiornamento contatto ${email} non riuscito: ${res.error.message}`);
    }
    await markSynced(email);
    return;
  }

  if (!exists) {
    const segmentIds = await Promise.all([...member.segments].map((k) => ensureSegment(k)));
    const res = await withRetry(() =>
      client().contacts.create({
        email,
        firstName: member.firstName ?? undefined,
        unsubscribed: false,
        segments: segmentIds.map((id) => ({ id })),
      })
    );
    if (res.error) throw new MarketingError(`Creazione contatto ${email} non riuscita: ${res.error.message}`);
    await markSynced(email);
    return;
  }

  if (found.data!.unsubscribed || (member.firstName && !found.data!.first_name)) {
    const res = await withRetry(() =>
      client().contacts.update({ email, unsubscribed: false, ...(member.firstName ? { firstName: member.firstName } : {}) })
    );
    if (res.error) throw new MarketingError(`Aggiornamento contatto ${email} non riuscito: ${res.error.message}`);
  }

  // Segmenti: aggiunge quelli mancanti e toglie quelli nostri non più validi.
  const current = await withRetry(() => client().contacts.segments.list({ email }));
  const currentIds = new Set((current.data?.data ?? []).map((s) => s.id));
  const managed = await prisma.marketingSegment.findMany();
  for (const key of member.segments) {
    const id = await ensureSegment(key);
    if (!currentIds.has(id)) {
      const res = await withRetry(() => client().contacts.segments.add({ email, segmentId: id }));
      if (res.error) throw new MarketingError(`Aggiunta al segmento non riuscita per ${email}: ${res.error.message}`);
    }
  }
  for (const seg of managed) {
    if (currentIds.has(seg.resendSegmentId) && !member.segments.has(seg.key as SegmentKey)) {
      await withRetry(() => client().contacts.segments.remove({ email, segmentId: seg.resendSegmentId }));
    }
  }
  await markSynced(email);
}

/** Come syncContact ma senza mai far fallire l'azione dell'utente che l'ha causata. */
export async function syncContactSafely(email: string | null | undefined): Promise<void> {
  if (!email || !resend) return;
  try {
    await syncContact(email);
  } catch (err) {
    console.error("[marketing] sincronizzazione contatto fallita:", err);
  }
}

/** Contatti con consenso non ancora allineati su Resend (es. iscritti prima di questa funzione). */
export async function pendingSyncEmails(limit?: number): Promise<{ emails: string[]; total: number }> {
  const [users, subs] = await Promise.all([
    prisma.user.findMany({ where: { marketingOptIn: true, marketingSyncedAt: null }, select: { email: true } }),
    prisma.newsletterSubscriber.findMany({ where: { status: "CONFIRMED", marketingSyncedAt: null }, select: { email: true } }),
  ]);
  const all = [...new Set([...users, ...subs].map((x) => x.email.toLowerCase()))];
  return { emails: limit ? all.slice(0, limit) : all, total: all.length };
}

/**
 * Toglie il consenso marketing a un indirizzo ovunque (account e newsletter).
 * Usato da disiscrizione, opt-out nell'account e webhook di Resend.
 */
export async function revokeMarketingConsent(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  await prisma.user.updateMany({ where: { email }, data: { marketingOptIn: false } });
  await prisma.newsletterSubscriber.updateMany({
    where: { email, status: { not: "UNSUBSCRIBED" } },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Campagne (Broadcast)

export interface BroadcastInput {
  name: string;
  subject: string;
  previewText?: string | null;
  html: string;
  segmentKey: SegmentKey;
  scheduledAt?: Date | null;
}

/** Crea e invia (o programma) il broadcast su Resend. Restituisce l'id del broadcast. */
export async function createAndSendBroadcast(input: BroadcastInput): Promise<string> {
  const segmentId = await ensureSegment(input.segmentKey);
  const res = await withRetry(() =>
    client().broadcasts.create({
      name: input.name,
      segmentId,
      from: MARKETING_FROM,
      subject: input.subject,
      previewText: input.previewText || undefined,
      html: input.html,
      send: true,
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt.toISOString() } : {}),
    })
  );
  if (res.error || !res.data) {
    throw new MarketingError(
      `Resend ha rifiutato la campagna: ${res.error?.message ?? "errore sconosciuto"}. Controlla che sull'account Resend sia attivo il piano marketing e che il dominio del mittente sia verificato.`
    );
  }
  return res.data.id;
}

export async function cancelBroadcast(id: string): Promise<void> {
  const res = await withRetry(() => client().broadcasts.cancel(id));
  if (res.error) throw new MarketingError(`Annullamento non riuscito: ${res.error.message}`);
}

export async function getBroadcastStatus(id: string) {
  const res = await withRetry(() => client().broadcasts.get(id));
  return res.data ?? null;
}

export interface BroadcastStats {
  totals: Partial<Record<string, number>> | null;
  totalsError: string | null;
  links: { url: string; clicks: number; uniqueClicks: number }[];
  linksError: string | null;
}

/**
 * Statistiche di una campagna. Le metriche aggregate (aperture, clic, disiscrizioni)
 * possono non essere ancora disponibili sull'account: in quel caso si mostra il motivo
 * e restano comunque i link cliccati.
 */
export async function getBroadcastStats(id: string): Promise<BroadcastStats> {
  const out: BroadcastStats = { totals: null, totalsError: null, links: [], linksError: null };
  try {
    const m = await client().emails.metrics({
      broadcastId: [id],
      dimensions: ["broadcast"],
      startDate: "2026-01-01",
      metrics: ["sent", "delivered", "unique_opened", "unique_clicked", "unsubscribed", "bounced", "complained"],
    });
    if (m.error || !m.data) out.totalsError = m.error?.message ?? "Metriche non disponibili.";
    else out.totals = m.data.totals;
  } catch (err) {
    out.totalsError = err instanceof Error ? err.message : "Metriche non disponibili.";
  }
  try {
    const l = await client().broadcasts.clickedLinks(id);
    if (l.error || !l.data) out.linksError = l.error?.message ?? "Link cliccati non disponibili.";
    else out.links = l.data.data.map((x) => ({ url: x.url, clicks: x.clicks, uniqueClicks: x.unique_clicks }));
  } catch (err) {
    out.linksError = err instanceof Error ? err.message : "Link cliccati non disponibili.";
  }
  return out;
}

/** Email di prova della campagna, inviata come email normale al solo admin. */
export async function sendTestEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await client().emails.send({ from: MARKETING_FROM, to, subject: `[PROVA] ${subject}`, html });
  if (res.error) throw new MarketingError(`Invio di prova non riuscito: ${res.error.message}`);
}
