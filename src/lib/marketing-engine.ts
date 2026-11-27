import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { MARKETING_FOOTER_HTML, marketingBaseHtml } from "@/lib/email";
import { buildAudience, SEGMENT_KEYS, type SegmentKey } from "@/lib/marketing";
import {
  addOpenPixel,
  ensureUnsubscribe,
  injectPreheader,
  isFullDocument,
  marketingBudget,
  personalize,
  rewriteLinks,
  signClick,
} from "@/lib/marketing-render";
import { absoluteUrl } from "@/lib/site";
import { cleanProductName } from "@/lib/product-art";

/**
 * Motore di invio dell'email marketing, tutto nel sito.
 *
 * - Ogni email da inviare è una riga MarketingSend in stato QUEUED (la coda).
 * - processQueue() invia quello che il limite giornaliero consente: il piano gratuito di
 *   Resend permette 100 email in 24 ore in TOTALE; ne lasciamo sempre 30 alle email degli
 *   ordini, quindi al massimo 70 email di marketing nelle ultime 24 ore. Le campagne più
 *   grandi partono a blocchi nei giorni successivi, in automatico.
 * - processQueue() gira: subito quando si invia una campagna, una volta al giorno dal cron
 *   di Vercel (/api/cron/marketing) e, al massimo ogni 15 minuti, dopo le visite al sito
 *   (maybeProcessQueue), così gli invii programmati partono senza bisogno di Vercel Pro.
 * - Resend fa solo da postino (emails/batch); aperture, clic e disiscrizioni li registra
 *   il sito (pixel, link firmati, pagina di disiscrizione).
 */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
export const MARKETING_FROM = process.env.EMAIL_MARKETING_FROM || process.env.EMAIL_FROM || "FMF Cards <onboarding@resend.dev>";

export const DAILY_EMAIL_LIMIT = Number(process.env.MARKETING_DAILY_EMAIL_LIMIT) || 100;
export const RESERVED_FOR_ORDERS = Number(process.env.MARKETING_RESERVED_FOR_ORDERS) || 30;
export const MARKETING_PER_DAY = Math.max(0, DAILY_EMAIL_LIMIT - RESERVED_FOR_ORDERS);

const DAY_MS = 24 * 3_600_000;
const LOCK_MS = 5 * 60_000;
const OPPORTUNISTIC_EVERY_MS = 15 * 60_000;

export function isMarketingConfigured(): boolean {
  return resend != null;
}

function trackingSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET mancante: serve per firmare i link delle email.");
  return s;
}

export const unsubscribeUrl = (sendId: string) => absoluteUrl(`/newsletter/disiscrizione/${sendId}`);
export const oneClickUnsubscribeUrl = (sendId: string) => absoluteUrl(`/api/m/u/${sendId}`);
export const openPixelUrl = (sendId: string) => absoluteUrl(`/api/m/o/${sendId}`);
export function trackedClickUrl(sendId: string, url: string): string {
  return `${absoluteUrl(`/api/m/c/${sendId}`)}?u=${encodeURIComponent(url)}&s=${signClick(trackingSecret(), sendId, url)}`;
}

/** HTML definitivo per un destinatario: personalizzato, con disiscrizione, clic e aperture tracciati. */
export function renderForRecipient(params: {
  sendId: string;
  subject: string;
  previewText?: string | null;
  bodyHtml: string;
  email: string;
  firstName?: string | null;
}): string {
  let html = marketingBaseHtml({ subject: params.subject, previewText: params.previewText, bodyHtml: params.bodyHtml });
  if (isFullDocument(params.bodyHtml)) html = injectPreheader(html, params.previewText);
  html = personalize(html, { firstName: params.firstName, email: params.email });
  const unsub = unsubscribeUrl(params.sendId);
  html = ensureUnsubscribe(html, unsub, MARKETING_FOOTER_HTML);
  html = rewriteLinks(html, (u) => trackedClickUrl(params.sendId, u), (u) => u.startsWith(unsub) || u.includes("/newsletter/disiscrizione/"));
  return addOpenPixel(html, openPixelUrl(params.sendId));
}

// ---------------------------------------------------------------------------
// Coda

/** Mette in coda una campagna per tutti i destinatari del suo gruppo (senza doppioni). */
export async function enqueueCampaign(campaignId: string): Promise<number> {
  const c = await prisma.marketingCampaign.findUnique({ where: { id: campaignId } });
  if (!c) return 0;
  const segment = (SEGMENT_KEYS as string[]).includes(c.segmentKey) ? (c.segmentKey as SegmentKey) : "all";
  const recipients = [...(await buildAudience()).values()].filter((m) => m.segments.has(segment));
  if (recipients.length) {
    await prisma.marketingSend.createMany({
      data: recipients.map((m) => ({ dedupeKey: `c:${c.id}:${m.email}`, campaignId: c.id, email: m.email, firstName: m.firstName })),
      skipDuplicates: true,
    });
  }
  const total = await prisma.marketingSend.count({ where: { campaignId: c.id } });
  await prisma.marketingCampaign.update({ where: { id: c.id }, data: { recipientCount: total } });
  return total;
}

/** Mette in coda un'email automatica (benvenuto, ordine non completato). */
export async function enqueueAutomation(params: { key: AutomationKey; email: string; firstName?: string | null; refId?: string }): Promise<void> {
  const auto = await getAutomation(params.key);
  if (!auto.enabled) return;
  const email = params.email.toLowerCase().trim();
  const dedupeKey = params.refId ? `a:${params.key}:${params.refId}` : `a:${params.key}:${email}`;
  await prisma.marketingSend.createMany({
    data: [{ dedupeKey, automationKey: params.key, email, firstName: params.firstName ?? null, refId: params.refId ?? null }],
    skipDuplicates: true,
  });
}

export async function sentInLast24h(): Promise<number> {
  return prisma.marketingSend.count({ where: { sentAt: { gt: new Date(Date.now() - DAY_MS) } } });
}

/** Prende il "turno" di lavoro sulla coda; false se un'altra esecuzione è già in corso. */
async function acquireLock(): Promise<boolean> {
  const now = new Date();
  const got = await prisma.marketingEngineState.updateMany({
    where: { id: 1, lockedAt: { lt: new Date(now.getTime() - LOCK_MS) } },
    data: { lockedAt: now },
  });
  if (got.count === 1) return true;
  const exists = await prisma.marketingEngineState.findUnique({ where: { id: 1 } });
  if (exists) return false;
  try {
    await prisma.marketingEngineState.create({ data: { id: 1, lockedAt: now, lastRunAt: new Date(0) } });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock() {
  await prisma.marketingEngineState.update({ where: { id: 1 }, data: { lockedAt: new Date(0), lastRunAt: new Date() } });
}

export interface QueueRunResult {
  sent: number;
  failed: number;
  skipped: number;
  budgetLeft: number;
  activated: number;
  busy?: boolean;
}

/**
 * Lavora la coda: avvia le campagne programmate arrivate all'orario, aggiunge i promemoria
 * per gli ordini non completati e invia quanto consentito dal limite giornaliero
 * (prima le automazioni, poi le campagne in ordine di arrivo).
 */
export async function processQueue(): Promise<QueueRunResult> {
  const result: QueueRunResult = { sent: 0, failed: 0, skipped: 0, budgetLeft: 0, activated: 0 };
  if (!(await acquireLock())) return { ...result, busy: true };
  try {
    // 1. campagne programmate arrivate all'orario
    const due = await prisma.marketingCampaign.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } } });
    for (const c of due) {
      await enqueueCampaign(c.id);
      await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "SENDING", sentAt: new Date() } });
      result.activated += 1;
    }

    // 2. promemoria ordini non completati
    await enqueueAbandonedOrderReminders();

    if (!resend) return result;

    // 3. invio entro il limite giornaliero
    let budget = marketingBudget({ dailyLimit: DAILY_EMAIL_LIMIT, reservedForOrders: RESERVED_FOR_ORDERS, sentLast24h: await sentInLast24h() });
    while (budget > 0) {
      const batch = await prisma.marketingSend.findMany({
        where: { status: "QUEUED", OR: [{ automationKey: { not: null } }, { campaign: { status: "SENDING" } }] },
        orderBy: [{ automationKey: { sort: "asc", nulls: "last" } }, { queuedAt: "asc" }],
        take: Math.min(budget, 100),
        include: { campaign: true },
      });
      if (!batch.length) break;

      // consenso ricontrollato al momento dell'invio
      const audience = await buildAudience(batch.map((b) => b.email));
      const automations = new Map<string, Awaited<ReturnType<typeof getAutomation>>>();
      const ready: { send: (typeof batch)[number]; subject: string; html: string }[] = [];
      for (const s of batch) {
        if (!audience.has(s.email)) {
          await prisma.marketingSend.update({ where: { id: s.id }, data: { status: "SKIPPED", error: "Consenso non più valido" } });
          result.skipped += 1;
          continue;
        }
        let subject: string;
        let previewText: string | null = null;
        let bodyHtml: string;
        if (s.campaign) {
          subject = s.campaign.subject;
          previewText = s.campaign.previewText;
          bodyHtml = s.campaign.bodyHtml;
        } else {
          const key = s.automationKey as AutomationKey;
          if (!automations.has(key)) automations.set(key, await getAutomation(key));
          const auto = automations.get(key)!;
          if (!auto.enabled) {
            await prisma.marketingSend.update({ where: { id: s.id }, data: { status: "SKIPPED", error: "Automazione disattivata" } });
            result.skipped += 1;
            continue;
          }
          subject = auto.subject;
          bodyHtml = key === "abandoned_order" && s.refId ? await fillOrderPlaceholders(auto.bodyHtml, s.refId) : auto.bodyHtml;
        }
        const firstName = s.firstName ?? audience.get(s.email)?.firstName ?? null;
        ready.push({
          send: s,
          subject: personalize(subject, { firstName, email: s.email }),
          html: renderForRecipient({ sendId: s.id, subject, previewText, bodyHtml, email: s.email, firstName }),
        });
      }
      if (!ready.length) continue;

      const res = await resend.batch.send(
        ready.map((r) => ({
          from: MARKETING_FROM,
          to: r.send.email,
          subject: r.subject,
          html: r.html,
          headers: {
            "List-Unsubscribe": `<${oneClickUnsubscribeUrl(r.send.id)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }))
      );
      const now = new Date();
      if (res.error || !res.data) {
        const msg = res.error?.message ?? "Invio non riuscito";
        // limite giornaliero di Resend raggiunto o problema temporaneo: si riprova al prossimo giro
        if (res.error?.name === "daily_quota_exceeded" || res.error?.name === "rate_limit_exceeded" || /quota|limit/i.test(msg)) break;
        await prisma.marketingSend.updateMany({ where: { id: { in: ready.map((r) => r.send.id) } }, data: { status: "FAILED", error: msg.slice(0, 300) } });
        result.failed += ready.length;
        break;
      }
      for (const [i, r] of ready.entries()) {
        await prisma.marketingSend.update({
          where: { id: r.send.id },
          data: { status: "SENT", sentAt: now, resendEmailId: res.data.data[i]?.id ?? null, error: null },
        });
      }
      result.sent += ready.length;
      budget -= ready.length;
    }
    result.budgetLeft = Math.max(0, budget);

    // 4. campagne completate
    const sending = await prisma.marketingCampaign.findMany({ where: { status: "SENDING" }, select: { id: true } });
    for (const c of sending) {
      const left = await prisma.marketingSend.count({ where: { campaignId: c.id, status: "QUEUED" } });
      if (left === 0) {
        const failed = await prisma.marketingSend.count({ where: { campaignId: c.id, status: "FAILED" } });
        await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "SENT", failedCount: failed } });
      }
    }
    return result;
  } finally {
    await releaseLock();
  }
}

/** Da chiamare con after() dopo le visite: lavora la coda al massimo ogni 15 minuti. */
export async function maybeProcessQueue(): Promise<void> {
  // mai durante la build (le pagine statiche vengono generate lì)
  if (process.env.NEXT_PHASE === "phase-production-build" || !resend) return;
  try {
    const state = await prisma.marketingEngineState.findUnique({ where: { id: 1 } });
    if (state && Date.now() - state.lastRunAt.getTime() < OPPORTUNISTIC_EVERY_MS) return;
    const pending = await prisma.marketingSend.count({ where: { status: "QUEUED" } });
    const scheduled = await prisma.marketingCampaign.count({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } } });
    const abandonedOn = (await prisma.marketingAutomation.findUnique({ where: { key: "abandoned_order" } }))?.enabled;
    if (!pending && !scheduled && !abandonedOn) return;
    await processQueue();
  } catch (err) {
    console.error("[marketing] elaborazione coda fallita:", err);
  }
}

// ---------------------------------------------------------------------------
// Automazioni

export type AutomationKey = "welcome" | "abandoned_order";

export const AUTOMATION_DEFAULTS: Record<AutomationKey, { title: string; description: string; subject: string; bodyHtml: string; delayHours: number }> = {
  welcome: {
    title: "Benvenuto",
    description: "Parte una volta sola a chi si iscrive alla newsletter o dà il consenso nell'account.",
    subject: "Benvenuto in FMF Cards, {{nome|collezionista}}!",
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:22px;">Benvenuto in FMF Cards!</h1>
<p style="margin:0 0 16px;line-height:1.6;">Ciao {{nome|collezionista}}, grazie per esserti iscritto. Ti scriveremo per nuovi arrivi, preordini e offerte su Pokémon, One Piece e non solo.</p>
<p style="margin:0 0 20px;line-height:1.6;">Intanto dai un'occhiata alle ultime novità:</p>
<a href="https://www.fmfcards.com/novita" style="display:inline-block;background:#C9A24E;color:#141414;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">Scopri le novità</a>`,
    delayHours: 0,
  },
  abandoned_order: {
    title: "Ordine non completato",
    description:
      "Promemoria a chi ha creato un ordine senza pagarlo (es. ha chiuso la pagina di pagamento). Solo a chi ha dato il consenso marketing, una volta per ordine, fino a 48 ore dopo.",
    subject: "Hai lasciato qualcosa nel carrello",
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:22px;">Il tuo ordine ti aspetta</h1>
<p style="margin:0 0 16px;line-height:1.6;">Ciao {{nome|collezionista}}, il pagamento dell'ordine {{numero_ordine}} non è stato completato. I prodotti che avevi scelto:</p>
{{prodotti}}
<p style="margin:20px 0 0;line-height:1.6;">Le disponibilità sono limitate: se ti interessano ancora, completa l'acquisto dal sito.</p>`,
    delayHours: 3,
  },
};

export async function getAutomation(key: AutomationKey) {
  const found = await prisma.marketingAutomation.findUnique({ where: { key } });
  if (found) return found;
  const d = AUTOMATION_DEFAULTS[key];
  return prisma.marketingAutomation.upsert({
    where: { key },
    create: { key, enabled: false, subject: d.subject, bodyHtml: d.bodyHtml, delayHours: d.delayHours },
    update: {},
  });
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** {{numero_ordine}} e {{prodotti}} (elenco con link alle schede) per il promemoria ordine. */
async function fillOrderPlaceholders(html: string, orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { slug: true, published: true } } } } },
  });
  if (!order) return html.replace(/\{\{\s*numero_ordine\s*\}\}/gi, "").replace(/\{\{\s*prodotti\s*\}\}/gi, "");
  const list = `<ul style="margin:0;padding-left:20px;line-height:1.8;">${order.items
    .map((it) => {
      const name = escapeHtml(cleanProductName(it.nameSnapshot));
      return it.product?.published
        ? `<li><a href="${absoluteUrl(`/prodotto/${it.product.slug}`)}" style="color:#141414;">${name}</a> × ${it.quantity}</li>`
        : `<li>${name} × ${it.quantity}</li>`;
    })
    .join("")}</ul>`;
  return html.replace(/\{\{\s*numero_ordine\s*\}\}/gi, escapeHtml(order.orderNumber)).replace(/\{\{\s*prodotti\s*\}\}/gi, list);
}

/** Aggiunge alla coda i promemoria per gli ordini non pagati (solo con consenso, una volta per ordine). */
async function enqueueAbandonedOrderReminders(): Promise<void> {
  const auto = await getAutomation("abandoned_order");
  if (!auto.enabled) return;
  const now = Date.now();
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: "PENDING",
      createdAt: { lte: new Date(now - auto.delayHours * 3_600_000), gte: new Date(now - (auto.delayHours + 48) * 3_600_000) },
    },
    select: { id: true, guestEmail: true, user: { select: { email: true } } },
  });
  if (!orders.length) return;
  const emails = orders.flatMap((o) => (o.user?.email ?? o.guestEmail ? [(o.user?.email ?? o.guestEmail)!] : []));
  const audience = await buildAudience(emails);
  for (const o of orders) {
    const email = (o.user?.email ?? o.guestEmail ?? "").toLowerCase();
    const member = audience.get(email);
    if (!member) continue;
    // nessun promemoria se nel frattempo ha pagato un altro ordine
    const paidAfter = await prisma.order.count({
      where: { paymentStatus: "PAID", id: { not: o.id }, OR: [{ guestEmail: email }, { user: { email } }], createdAt: { gte: new Date(now - (auto.delayHours + 48) * 3_600_000) } },
    });
    if (paidAfter) continue;
    await enqueueAutomation({ key: "abandoned_order", email, firstName: member.firstName, refId: o.id });
  }
}

// ---------------------------------------------------------------------------
// Statistiche

export interface CampaignStats {
  total: number;
  sent: number;
  queued: number;
  failed: number;
  skipped: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  links: { url: string; clicks: number; people: number }[];
  lastError: string | null;
}

export async function campaignStats(campaignId: string): Promise<CampaignStats> {
  const [byStatus, opened, clicked, unsubscribed, clicks, lastFailed] = await Promise.all([
    prisma.marketingSend.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } }),
    prisma.marketingSend.count({ where: { campaignId, openedAt: { not: null } } }),
    prisma.marketingSend.count({ where: { campaignId, clickedAt: { not: null } } }),
    prisma.marketingSend.count({ where: { campaignId, unsubscribedAt: { not: null } } }),
    prisma.marketingClick.findMany({ where: { send: { campaignId } }, select: { url: true, sendId: true } }),
    prisma.marketingSend.findFirst({ where: { campaignId, status: "FAILED" }, orderBy: { queuedAt: "desc" }, select: { error: true } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const linkMap = new Map<string, { clicks: number; people: Set<string> }>();
  for (const c of clicks) {
    const e = linkMap.get(c.url) ?? { clicks: 0, people: new Set<string>() };
    e.clicks += 1;
    e.people.add(c.sendId);
    linkMap.set(c.url, e);
  }
  return {
    total: byStatus.reduce((a, b) => a + b._count._all, 0),
    sent: count("SENT"),
    queued: count("QUEUED"),
    failed: count("FAILED"),
    skipped: count("SKIPPED"),
    opened,
    clicked,
    unsubscribed,
    links: [...linkMap.entries()]
      .map(([url, v]) => ({ url, clicks: v.clicks, people: v.people.size }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 15),
    lastError: lastFailed?.error ?? null,
  };
}

export async function automationStats(key: AutomationKey) {
  const [sent, opened, clicked, queued] = await Promise.all([
    prisma.marketingSend.count({ where: { automationKey: key, status: "SENT" } }),
    prisma.marketingSend.count({ where: { automationKey: key, openedAt: { not: null } } }),
    prisma.marketingSend.count({ where: { automationKey: key, clickedAt: { not: null } } }),
    prisma.marketingSend.count({ where: { automationKey: key, status: "QUEUED" } }),
  ]);
  return { sent, opened, clicked, queued };
}

/** Situazione della coda: inviate nelle ultime 24 ore, posti liberi, in attesa. */
export async function queueOverview() {
  const [sent24h, queued] = await Promise.all([
    sentInLast24h(),
    prisma.marketingSend.count({ where: { status: "QUEUED", OR: [{ automationKey: { not: null } }, { campaign: { status: "SENDING" } }] } }),
  ]);
  const freeNow = marketingBudget({ dailyLimit: DAILY_EMAIL_LIMIT, reservedForOrders: RESERVED_FOR_ORDERS, sentLast24h: sent24h });
  return { sent24h, queued, freeNow, perDay: MARKETING_PER_DAY };
}
