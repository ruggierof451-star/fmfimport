import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "FMF Import <onboarding@resend.dev>";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F3F3F3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#141414;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#000;padding:24px 32px;">
          <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:.5px;">FMF <span style="color:#C9A646;">IMPORT</span></span>
        </td></tr>
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 32px;background:#FAFAFA;border-top:1px solid #EAEAEA;">
          <p style="margin:0;font-size:12px;color:#8A8A8A;line-height:1.6;">
            FMF Cards S.R.L.S. · P.IVA 11105221219 · Traversa Garibaldi 24, 80040 Striano (NA)<br />
            Hai ricevuto questa email perché hai un account o un ordine su <a href="${SITE_URL}" style="color:#8A8A8A;">fmfimport.it</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;margin-top:8px;">${label}</a>`;
}

async function send(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
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

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = layout(
    "Reimposta la tua password",
    `<h1 style="font-size:20px;margin:0 0 12px;">Reimposta la tua password</h1>
     <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 20px;">
       Hai richiesto di reimpostare la password del tuo account FMF Import. Il link è valido per 1 ora.
       Se non sei stato tu a fare questa richiesta, ignora questa email: la tua password resterà invariata.
     </p>
     ${button(resetUrl, "Reimposta password")}
     <p style="font-size:12px;color:#999;margin-top:24px;">Se il pulsante non funziona, copia questo link nel browser:<br /><span style="word-break:break-all;">${resetUrl}</span></p>`
  );
  return send(to, "Reimposta la tua password · FMF Import", html);
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  orderNumber: string;
  totalFormatted: string;
  items: { name: string; quantity: number; lineTotalFormatted: string }[];
}) {
  const rows = params.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;font-size:14px;color:#222;">${i.name} <span style="color:#999;">× ${i.quantity}</span></td><td style="padding:8px 0;font-size:14px;text-align:right;white-space:nowrap;">${i.lineTotalFormatted}</td></tr>`
    )
    .join("");
  const html = layout(
    "Ordine confermato",
    `<h1 style="font-size:20px;margin:0 0 6px;">Grazie per il tuo ordine!</h1>
     <p style="font-size:14px;color:#444;margin:0 0 20px;">Ordine <b>${params.orderNumber}</b> ricevuto correttamente. Ti aggiorneremo via email a ogni cambio di stato.</p>
     <table role="presentation" width="100%" style="border-top:1px solid #EEE;border-bottom:1px solid #EEE;margin:16px 0;">${rows}</table>
     <table role="presentation" width="100%"><tr>
       <td style="font-size:15px;font-weight:700;padding-top:10px;">Totale</td>
       <td style="font-size:15px;font-weight:700;text-align:right;padding-top:10px;">${params.totalFormatted}</td>
     </tr></table>
     ${button(`${SITE_URL}/ordine/${encodeURIComponent(params.orderNumber)}`, "Vedi il tuo ordine")}`
  );
  return send(params.to, `Ordine confermato ${params.orderNumber} · FMF Import`, html);
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
      ? `<p style="font-size:14px;color:#444;margin:12px 0 0;">Corriere: <b>${params.trackingCarrier}</b> · Tracking: <b>${params.trackingNumber}</b></p>`
      : "";
  const html = layout(
    "Aggiornamento ordine",
    `<h1 style="font-size:20px;margin:0 0 6px;">Il tuo ordine è stato aggiornato</h1>
     <p style="font-size:14px;color:#444;margin:0 0 4px;">Ordine <b>${params.orderNumber}</b></p>
     <p style="font-size:16px;font-weight:700;margin:4px 0 0;">Nuovo stato: ${label}</p>
     ${tracking}
     ${button(`${SITE_URL}/ordine/${params.orderId}`, "Vedi il tuo ordine")}`
  );
  return send(params.to, `Ordine ${params.orderNumber}: ${label} · FMF Import`, html);
}

export async function sendContactReplyNotice(to: string) {
  const html = layout(
    "Messaggio ricevuto",
    `<h1 style="font-size:20px;margin:0 0 12px;">Abbiamo ricevuto il tuo messaggio</h1>
     <p style="font-size:14px;line-height:1.6;color:#444;">Ti risponderemo il prima possibile, di solito entro 24 ore lavorative (mar-ven 8-19).</p>`
  );
  return send(to, "Messaggio ricevuto · FMF Import", html);
}
