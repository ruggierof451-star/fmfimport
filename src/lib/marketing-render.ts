import { createHmac } from "crypto";

/**
 * Preparazione dell'HTML di una email di marketing per un singolo destinatario:
 * segnaposto personali, link di disiscrizione, link tracciati per i clic e pixel per le
 * aperture. Funzioni pure (nessun database), testate in marketing-render.test.ts.
 *
 * Segnaposto utilizzabili nell'HTML (anche quello copiato da Claude Design):
 *   {{nome}}          nome del destinatario, se lo conosciamo (altrimenti vuoto)
 *   {{nome|amico}}    nome, oppure il testo dopo "|" se il nome non lo conosciamo
 *   {{email}}         indirizzo del destinatario
 *   {{disiscrizione}} link per disiscriversi; se manca, il sito aggiunge in fondo un
 *                     piè di pagina con il link (obbligatorio per legge)
 */

export function isFullDocument(html: string): boolean {
  return /<html[\s>]/i.test(html) || /<body[\s>]/i.test(html);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function personalize(html: string, data: { firstName?: string | null; email: string }): string {
  return html
    .replace(/\{\{\s*nome\s*(?:\|\s*([^}]*?))?\s*\}\}/gi, (_m, fallback?: string) => escapeHtml(data.firstName?.trim() || fallback || ""))
    .replace(/\{\{\s*email\s*\}\}/gi, escapeHtml(data.email));
}

/** Inserisce del codice subito prima di </body> (o in fondo se non c'è). */
function beforeBodyEnd(html: string, snippet: string): string {
  const i = html.search(/<\/body>/i);
  return i === -1 ? html + snippet : html.slice(0, i) + snippet + html.slice(i);
}

/** Inserisce del codice subito dopo <body ...> (o in testa se non c'è). */
function afterBodyStart(html: string, snippet: string): string {
  const m = html.match(/<body[^>]*>/i);
  if (!m || m.index == null) return snippet + html;
  const at = m.index + m[0].length;
  return html.slice(0, at) + snippet + html.slice(at);
}

export const UNSUBSCRIBE_PLACEHOLDER = /\{\{\s*disiscrizione\s*\}\}/gi;

/**
 * Link di disiscrizione: sostituisce {{disiscrizione}}; se il testo non lo contiene,
 * aggiunge un piè di pagina standard con il link e i dati dell'azienda.
 */
export function ensureUnsubscribe(html: string, unsubscribeUrl: string, footerHtml: string): string {
  if (UNSUBSCRIBE_PLACEHOLDER.test(html)) {
    UNSUBSCRIBE_PLACEHOLDER.lastIndex = 0;
    return html.replace(UNSUBSCRIBE_PLACEHOLDER, unsubscribeUrl);
  }
  return beforeBodyEnd(html, footerHtml.replace(UNSUBSCRIBE_PLACEHOLDER, unsubscribeUrl));
}

/** Testo nascosto mostrato come anteprima accanto all'oggetto nella casella di posta. */
export function injectPreheader(html: string, previewText: string | null | undefined): string {
  if (!previewText) return html;
  const span = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(previewText)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>`;
  return afterBodyStart(html, span);
}

export function signClick(secret: string, sendId: string, url: string): string {
  return createHmac("sha256", secret).update(`${sendId}|${url}`).digest("base64url").slice(0, 22);
}

export function verifyClick(secret: string, sendId: string, url: string, sig: string): boolean {
  return signClick(secret, sendId, url) === sig;
}

/**
 * Sostituisce i link http(s) con il link di tracciamento del sito, che registra il clic
 * e reindirizza all'indirizzo originale (firmato, così non può essere usato per
 * reindirizzare altrove). I link di disiscrizione restano diretti.
 */
export function rewriteLinks(html: string, makeTrackedUrl: (url: string) => string, skip: (url: string) => boolean): string {
  return html.replace(/(<a\b[^>]*?\bhref\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi, (full, pre: string, quote: string, rawUrl: string) => {
    const url = rawUrl.replace(/&amp;/g, "&");
    if (skip(url)) return full;
    return `${pre}${quote}${makeTrackedUrl(url).replace(/&/g, "&amp;")}${quote}`;
  });
}

export function addOpenPixel(html: string, pixelUrl: string): string {
  return beforeBodyEnd(html, `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />`);
}

/**
 * Quante email di marketing si possono inviare adesso: limite del piano Resend sulle
 * ultime 24 ore, meno la quota riservata alle email degli ordini, meno quelle di
 * marketing già partite nelle ultime 24 ore.
 */
export function marketingBudget(params: { dailyLimit: number; reservedForOrders: number; sentLast24h: number }): number {
  return Math.max(0, params.dailyLimit - params.reservedForOrders - params.sentLast24h);
}

/** Giorni necessari (circa) per completare una coda con il ritmo giornaliero consentito. */
export function estimatedDays(queued: number, perDay: number): number {
  if (queued <= 0) return 0;
  if (perDay <= 0) return Infinity;
  return Math.ceil(queued / perDay);
}
