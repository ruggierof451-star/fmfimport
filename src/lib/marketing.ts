import { prisma } from "@/lib/prisma";
import { computeAudience, countSegments, type AudienceMember, type SegmentKey } from "@/lib/marketing-audience";

/**
 * Email marketing gestito dal sito: chi può ricevere le email e in quali gruppi.
 *
 * Il consenso vive SOLO nel nostro database:
 * - utenti registrati con marketingOptIn = true;
 * - iscritti alla newsletter con status CONFIRMED (dal modulo con doppia conferma, oppure
 *   importati dall'admin che ne dichiara il consenso).
 * L'invio, la coda e le statistiche sono in marketing-engine.ts; Resend fa solo da
 * "postino" (invio semplice), entro il limite giornaliero del piano gratuito.
 */

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

/** Pubblico con consenso (dal database) e relativi gruppi: vedi computeAudience. */
export async function buildAudience(onlyEmails?: string[]): Promise<Map<string, AudienceMember>> {
  const emailFilter = onlyEmails ? { in: onlyEmails.map((e) => e.toLowerCase()) } : undefined;
  const [users, subscribers, paidOrders] = await Promise.all([
    prisma.user.findMany({
      where: { marketingOptIn: true, ...(emailFilter ? { email: emailFilter } : {}) },
      select: { email: true, name: true, role: true },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { status: "CONFIRMED", ...(emailFilter ? { email: emailFilter } : {}) },
      select: { email: true, interests: true, firstName: true },
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

/** true se l'indirizzo ha ancora un consenso marketing valido. */
export async function hasMarketingConsent(email: string): Promise<boolean> {
  return (await buildAudience([email])).has(email.toLowerCase().trim());
}

/**
 * Toglie il consenso marketing a un indirizzo ovunque (account e newsletter) e toglie
 * dalla coda le email di marketing non ancora partite. Usato da disiscrizione, opt-out
 * nell'account e pannello admin.
 */
export async function revokeMarketingConsent(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  await prisma.$transaction([
    prisma.user.updateMany({ where: { email }, data: { marketingOptIn: false } }),
    prisma.newsletterSubscriber.updateMany({
      where: { email, status: { not: "UNSUBSCRIBED" } },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    }),
    prisma.marketingSend.updateMany({ where: { email, status: "QUEUED" }, data: { status: "SKIPPED", error: "Disiscritto" } }),
  ]);
}

export interface ContactRow {
  email: string;
  firstName: string | null;
  status: "SUBSCRIBED" | "PENDING";
  sources: string[]; // account, newsletter, import
  segments: SegmentKey[];
  interests: string[];
  since: Date | null;
}

/** Elenco contatti per il pannello: iscritti con consenso + iscrizioni in attesa di conferma. */
export async function listContacts(): Promise<ContactRow[]> {
  const [audience, users, subs] = await Promise.all([
    buildAudience(),
    prisma.user.findMany({ where: { marketingOptIn: true }, select: { email: true, createdAt: true } }),
    prisma.newsletterSubscriber.findMany({ where: { status: { in: ["CONFIRMED", "PENDING"] } } }),
  ]);
  const userSince = new Map(users.map((u) => [u.email.toLowerCase(), u.createdAt]));
  const subByEmail = new Map(subs.map((s) => [s.email.toLowerCase(), s]));
  const rows: ContactRow[] = [];
  for (const m of audience.values()) {
    const sub = subByEmail.get(m.email);
    const sources = [userSince.has(m.email) ? "account" : null, sub?.status === "CONFIRMED" ? sub.source : null].filter(Boolean) as string[];
    rows.push({
      email: m.email,
      firstName: m.firstName,
      status: "SUBSCRIBED",
      sources,
      segments: [...m.segments],
      interests: sub?.interests ?? [],
      since: sub?.confirmedAt ?? userSince.get(m.email) ?? null,
    });
  }
  for (const s of subs) {
    if (s.status !== "PENDING" || audience.has(s.email.toLowerCase())) continue;
    rows.push({ email: s.email, firstName: s.firstName, status: "PENDING", sources: [s.source], segments: [], interests: s.interests, since: s.createdAt });
  }
  return rows.sort((a, b) => (b.since?.getTime() ?? 0) - (a.since?.getTime() ?? 0));
}
