import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { renderEmailTemplate, escapeHtml } from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "FMF Cards <onboarding@resend.dev>";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const GOLD = "#C9A646";
const BANK_IBAN = process.env.BANK_IBAN;
const BANK_ACCOUNT_HOLDER = process.env.BANK_ACCOUNT_HOLDER || "FMF Cards S.R.L.S.";

function layout(preheader: string, bodyHtml: string, opts: { unsubscribeUrl?: string } = {}): string {
  const footerNote = opts.unsubscribeUrl
    ? `Hai ricevuto questa email perché hai accettato di ricevere offerte e novità da <a href="${SITE_URL}" style="color:#8A8A8A;">fmfcards.com</a>.
       <a href="${opts.unsubscribeUrl}" style="color:#8A8A8A;text-decoration:underline;">Annulla l&apos;iscrizione</a>.`
    : `Hai ricevuto questa email perché hai un account o un ordine su <a href="${SITE_URL}" style="color:#8A8A8A;">fmfcards.com</a>.`;
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>FMF Cards</title></head>
<body style="margin:0;padding:0;background:#F0F0F0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#141414;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F0F0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #EAEAEA;">
        <tr><td style="background:#000;padding:22px 32px;">
          <img src="${SITE_URL}/fmf-cards-logo-white.png" width="180" alt="FMF CARDS" style="display:block;border:0;width:180px;height:auto;color:#fff;font-size:18px;font-weight:700;" />
        </td></tr>
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 32px;background:#FAFAFA;border-top:1px solid #EAEAEA;">
          <p style="margin:0;font-size:12px;color:#8A8A8A;line-height:1.6;">
            FMF Cards S.R.L.S. · P.IVA 11105221219 · Traversa Garibaldi 24, 80040 Striano (NA)<br />
            ${footerNote}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string, opts: { gold?: boolean } = {}): string {
  const bg = opts.gold ? GOLD : "#000";
  const color = opts.gold ? "#000" : "#fff";
  return `<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;margin-top:8px;">${label}</a>`;
}

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  PENDING_PAYMENT: { bg: "#FFF3D6", fg: "#8A6200" },
  PAYMENT_CONFIRMED: { bg: "#E3F6E9", fg: "#15663F" },
  AVAILABILITY_CHECK: { bg: "#E8EEFC", fg: "#2A4F9E" },
  TO_PROCURE: { bg: "#E8EEFC", fg: "#2A4F9E" },
  PREPARING: { bg: "#E8EEFC", fg: "#2A4F9E" },
  SHIPPED: { bg: "#E3F6E9", fg: "#15663F" },
  DELIVERED: { bg: "#E3F6E9", fg: "#15663F" },
  CANCELLED: { bg: "#FBE5E5", fg: "#9C1F1F" },
  REFUNDED: { bg: "#FBE5E5", fg: "#9C1F1F" },
};

function badge(label: string, status: string): string {
  const tone = STATUS_TONE[status] ?? { bg: "#EFEFEF", fg: "#333" };
  return `<span style="display:inline-block;background:${tone.bg};color:${tone.fg};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;">${label}</span>`;
}

async function send(to: string | string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY non configurata — email NON inviata. Destinatario: ${to} · Oggetto: ${subject}`);
    return { ok: false, error: "Servizio email non configurato." };
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (err) {
    console.error("[email] invio fallito:", err);
    return { ok: false, error: "Invio email fallito." };
  }
}

/** Email di tutti gli account con ruolo ADMIN, per le notifiche interne (nuovo ordine, messaggio, richiesta). */
async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  return admins.map((a) => a.email);
}

/**
 * Testo e oggetto di ogni email automatica arrivano dai modelli modificabili
 * dall'admin (vedi email-templates.ts e /admin/email): qui si preparano solo i
 * valori da inserire nei segnaposto e i blocchi HTML generati dal sito.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { subject, bodyHtml } = await renderEmailTemplate("password_reset", {
    text: { link: resetUrl },
    blocks: { pulsante: button(resetUrl, "Reimposta password") },
  });
  return send(to, subject, layout("Reimposta la password del tuo account FMF Cards.", bodyHtml));
}

export async function sendWelcomeEmail(to: string, name: string) {
  const url = `${SITE_URL}/account`;
  const { subject, bodyHtml } = await renderEmailTemplate("account_welcome", {
    text: { nome: name || "ciao" },
    blocks: { pulsante_account: button(url, "Vai al tuo account") },
  });
  return send(to, subject, layout("Il tuo account FMF Cards è pronto.", bodyHtml));
}

export async function sendPaymentFailedEmail(params: { to: string; orderNumber: string; totalFormatted: string }) {
  const url = `${SITE_URL}/carrello`;
  const { subject, bodyHtml } = await renderEmailTemplate("payment_failed", {
    text: { numero_ordine: params.orderNumber, totale: params.totalFormatted },
    blocks: { pulsante_riprova: button(url, "Riprova l'acquisto") },
  });
  return send(params.to, subject, layout("Il pagamento del tuo ordine non è stato completato.", bodyHtml));
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  orderNumber: string;
  totalFormatted: string;
  paymentMethod?: "CARD" | "PAYPAL" | "BANK_TRANSFER";
  items: { name: string; quantity: number; lineTotalFormatted: string }[];
}) {
  const rows = params.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;font-size:14px;color:#222;border-bottom:1px solid #F2F2F2;">${escapeHtml(i.name)} <span style="color:#999;">× ${i.quantity}</span></td><td style="padding:8px 0;font-size:14px;text-align:right;white-space:nowrap;border-bottom:1px solid #F2F2F2;">${i.lineTotalFormatted}</td></tr>`
    )
    .join("");

  const itemsBlock = `<table role="presentation" width="100%" style="border-top:1px solid #EEE;margin:16px 0;">${rows}</table>
     <table role="presentation" width="100%"><tr>
       <td style="font-size:15px;font-weight:700;padding-top:10px;">Totale</td>
       <td style="font-size:15px;font-weight:700;text-align:right;padding-top:10px;">${params.totalFormatted}</td>
     </tr></table>`;

  const bankBlock =
    params.paymentMethod === "BANK_TRANSFER"
      ? BANK_IBAN
        ? `<div style="margin:20px 0;padding:16px 18px;background:#FBF7ED;border:1px solid #EEE1BC;border-radius:10px;">
             <p style="margin:0 0 8px;font-size:14px;font-weight:700;">Dati per il bonifico</p>
             <p style="margin:0;font-size:14px;line-height:1.7;color:#333;">
               Intestatario: <b>${BANK_ACCOUNT_HOLDER}</b><br />
               IBAN: <b style="letter-spacing:.5px;">${BANK_IBAN}</b><br />
               Causale: <b>${params.orderNumber}</b>
             </p>
             <p style="margin:10px 0 0;font-size:13px;color:#777;">La spedizione parte alla ricezione del bonifico.</p>
           </div>`
        : `<div style="margin:20px 0;padding:16px 18px;background:#FBF7ED;border:1px solid #EEE1BC;border-radius:10px;">
             <p style="margin:0;font-size:14px;color:#333;">
               Ti invieremo a breve, con una email separata, i dati per il bonifico. Indica sempre <b>${params.orderNumber}</b> come causale.
             </p>
           </div>`
      : "";

  const { subject, bodyHtml } = await renderEmailTemplate("order_confirmation", {
    text: { numero_ordine: params.orderNumber, totale: params.totalFormatted },
    blocks: {
      tabella_prodotti: itemsBlock,
      dati_bonifico: bankBlock,
      pulsante_ordine: button(`${SITE_URL}/ordine/${encodeURIComponent(params.orderNumber)}`, "Vedi il tuo ordine", { gold: true }),
    },
  });
  return send(params.to, subject, layout(`Ordine ${params.orderNumber} ricevuto — totale ${params.totalFormatted}.`, bodyHtml));
}

export async function sendAdminNewOrderNotification(params: {
  orderNumber: string;
  orderId: string;
  totalFormatted: string;
  customerEmail: string;
  paymentMethod: "CARD" | "PAYPAL" | "BANK_TRANSFER";
  itemsSummary: string;
}) {
  const admins = await getAdminEmails();
  if (!admins.length) return { ok: false, error: "Nessun admin da notificare." };

  const { subject, bodyHtml } = await renderEmailTemplate("admin_new_order", {
    text: {
      numero_ordine: params.orderNumber,
      totale: params.totalFormatted,
      cliente: params.customerEmail,
      metodo_pagamento:
        params.paymentMethod === "BANK_TRANSFER" ? "Bonifico bancario" : params.paymentMethod === "PAYPAL" ? "PayPal" : "Carta",
      articoli: params.itemsSummary,
    },
    blocks: { pulsante_ordine: button(`${SITE_URL}/admin/ordini/${params.orderId}`, "Apri l'ordine", { gold: true }) },
  });
  return send(admins, subject, layout(`Nuovo ordine ${params.orderNumber} da ${params.customerEmail}.`, bodyHtml));
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "In attesa di pagamento",
  PAYMENT_CONFIRMED: "Pagamento confermato",
  AVAILABILITY_CHECK: "Verifica disponibilità",
  TO_PROCURE: "In approvvigionamento",
  PREPARING: "In preparazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
  REFUNDED: "Rimborsato",
};

export async function sendOrderStatusEmail(params: {
  to: string;
  orderNumber: string;
  status: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  orderId: string;
}) {
  const label = STATUS_LABEL[params.status] ?? params.status;
  const tracking =
    params.trackingCarrier && params.trackingNumber
      ? `<p style="font-size:14px;color:#444;margin:14px 0 0;">Corriere: <b>${escapeHtml(params.trackingCarrier)}</b> · Tracking: <b>${escapeHtml(params.trackingNumber)}</b></p>`
      : "";
  const { subject, bodyHtml } = await renderEmailTemplate("order_status", {
    text: { numero_ordine: params.orderNumber, stato: label },
    blocks: {
      badge_stato: badge(label, params.status),
      tracking,
      pulsante_ordine: button(`${SITE_URL}/ordine/${params.orderId}`, "Vedi il tuo ordine", { gold: true }),
    },
  });
  return send(params.to, subject, layout(`Ordine ${params.orderNumber}: ${label}.`, bodyHtml));
}

export async function sendContactReplyNotice(to: string) {
  const { subject, bodyHtml } = await renderEmailTemplate("contact_received", {});
  return send(to, subject, layout("Abbiamo ricevuto il tuo messaggio, ti rispondiamo a breve.", bodyHtml));
}

export async function sendAdminNewContactMessageNotification(params: { email: string; orderNumber?: string | null; message: string }) {
  const admins = await getAdminEmails();
  if (!admins.length) return { ok: false, error: "Nessun admin da notificare." };

  const { subject, bodyHtml } = await renderEmailTemplate("admin_new_contact", {
    text: { cliente: params.email, numero_ordine: params.orderNumber ?? "—", messaggio: params.message },
    blocks: { pulsante: button(`${SITE_URL}/admin/messaggi`, "Apri i messaggi", { gold: true }) },
  });
  return send(admins, subject, layout(`Nuovo messaggio da ${params.email}.`, bodyHtml));
}

export async function sendResellerRequestReceivedEmail(to: string, companyName: string) {
  const { subject, bodyHtml } = await renderEmailTemplate("reseller_request_received", { text: { azienda: companyName } });
  return send(to, subject, layout(`Richiesta rivenditore ricevuta per ${companyName}.`, bodyHtml));
}

export async function sendAdminNewResellerRequestNotification(params: {
  companyName: string;
  vatNumber: string;
  contactName: string;
  email: string;
}) {
  const admins = await getAdminEmails();
  if (!admins.length) return { ok: false, error: "Nessun admin da notificare." };

  const { subject, bodyHtml } = await renderEmailTemplate("admin_new_reseller_request", {
    text: {
      azienda: params.companyName,
      partita_iva: params.vatNumber,
      referente: params.contactName,
      email: params.email,
    },
    blocks: { pulsante: button(`${SITE_URL}/admin/rivenditori`, "Valuta la richiesta", { gold: true }) },
  });
  return send(admins, subject, layout(`Nuova richiesta rivenditore: ${params.companyName}.`, bodyHtml));
}

export async function sendResellerRequestDecisionEmail(params: {
  to: string;
  companyName: string;
  approved: boolean;
  note?: string | null;
}) {
  const { subject, bodyHtml } = params.approved
    ? await renderEmailTemplate("reseller_approved", {
        text: { azienda: params.companyName },
        blocks: { pulsante_account: button(`${SITE_URL}/account`, "Vai al tuo account", { gold: true }) },
      })
    : await renderEmailTemplate("reseller_rejected", {
        text: { azienda: params.companyName, motivo: params.note ? `Motivo: ${params.note}` : "" },
      });
  return send(
    params.to,
    subject,
    layout(
      params.approved ? `La tua richiesta per ${params.companyName} è stata accettata.` : `Aggiornamento sulla tua richiesta rivenditore.`,
      bodyHtml
    )
  );
}

/**
 * Anteprima di un modello di email automatica: usa il testo che l'admin sta scrivendo
 * (non ancora salvato) con valori d'esempio, e la manda al suo indirizzo.
 */
export async function sendTemplatePreview(
  to: string,
  subjectTemplate: string,
  bodyTemplate: string,
  values: { text: Record<string, string>; blocks: Record<string, string> }
): Promise<{ ok: boolean; error?: string }> {
  const fill = (tpl: string, map: Record<string, string>) =>
    tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => (name in map ? map[name] : match));
  const escapedText = Object.fromEntries(Object.entries(values.text).map(([k, v]) => [k, escapeHtml(v)]));
  const subject = fill(subjectTemplate, { ...Object.fromEntries(Object.keys(values.blocks).map((k) => [k, ""])), ...values.text }).trim();
  const bodyHtml = fill(bodyTemplate, { ...escapedText, ...values.blocks });
  return send(to, `[PROVA] ${subject}`, layout(subject, bodyHtml));
}

/**
 * Base HTML di una email di marketing (campagna o automazione), prima della
 * personalizzazione per il singolo destinatario (vedi marketing-engine.ts).
 * - HTML completo (es. copiato da Claude Design): usato così com'è.
 * - Solo contenuto: inserito nel modello grafico delle email del sito.
 * Il link di disiscrizione resta come segnaposto {{disiscrizione}}.
 */
export function marketingBaseHtml(params: { subject: string; previewText?: string | null; bodyHtml: string }): string {
  if (/<html[\s>]/i.test(params.bodyHtml) || /<body[\s>]/i.test(params.bodyHtml)) return params.bodyHtml;
  return layout(params.previewText || params.subject, params.bodyHtml, { unsubscribeUrl: "{{disiscrizione}}" });
}

/** Piè di pagina aggiunto alle email complete che non contengono già {{disiscrizione}}. */
export const MARKETING_FOOTER_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8A8A8A;line-height:1.6;">
FMF Cards S.R.L.S. · P.IVA 11105221219 · Traversa Garibaldi 24, 80040 Striano (NA)<br />
Hai ricevuto questa email perché hai accettato di ricevere offerte e novità da FMF Cards.
<a href="{{disiscrizione}}" style="color:#8A8A8A;text-decoration:underline;">Annulla l&apos;iscrizione</a>.
</td></tr></table>`;

/** Email di conferma iscrizione alla newsletter (doppio consenso). */
export async function sendNewsletterConfirmEmail(to: string, confirmUrl: string) {
  const subject = "Conferma la tua iscrizione alla newsletter FMF Cards";
  await send(
    to,
    subject,
    layout(
      "Un clic per confermare l'iscrizione",
      `<h1 style="margin:0 0 12px;font-size:22px;">Conferma l&apos;iscrizione</h1>
       <p style="margin:0 0 16px;line-height:1.6;">Hai chiesto di ricevere offerte, novità e nuovi arrivi di FMF Cards. Conferma con il pulsante qui sotto: finché non confermi non ti invieremo nulla.</p>
       ${button(confirmUrl, "Confermo l'iscrizione", { gold: true })}
       <p style="margin:20px 0 0;font-size:13px;color:#8A8A8A;line-height:1.6;">Se non sei stato tu, ignora questa email: senza conferma l&apos;iscrizione non viene attivata.</p>`
    )
  );
}
