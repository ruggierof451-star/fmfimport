import { prisma } from "@/lib/prisma";

/**
 * Email automatiche modificabili dall'admin (sezione "Email automatiche").
 *
 * Ogni modello ha un testo predefinito qui nel codice; l'admin può sovrascriverlo
 * (tabella EmailTemplate) e ripristinarlo in qualsiasi momento. I segnaposto
 * {{nome}} vengono sostituiti al momento dell'invio:
 * - quelli "testo" (dati del cliente/ordine) vengono sempre messi in sicurezza (escape
 *   HTML), così un nome azienda o un messaggio non possono alterare l'email;
 * - quelli "blocco" sono pezzi già pronti generati dal sito (tabella prodotti, pulsante,
 *   dati bonifico...), da posizionare dove si preferisce nel testo.
 * Il contenuto viene sempre inserito nel modello grafico FMF Cards (logo e piè di pagina).
 */

export interface TemplatePlaceholder {
  name: string;
  description: string;
  kind: "text" | "block";
  /** Valore d'esempio per l'invio di prova dall'admin. */
  sample: string;
}

export interface EmailTemplateDef {
  key: string;
  label: string;
  /** Quando parte, in parole semplici. */
  trigger: string;
  recipient: "Cliente" | "Admin";
  placeholders: TemplatePlaceholder[];
  defaultSubject: string;
  defaultBody: string;
}

const H1 = `style="font-size:20px;margin:0 0 12px;"`;
const P = `style="font-size:14px;line-height:1.6;color:#444;margin:0 0 16px;"`;

const SAMPLE_BUTTON = `<a href="#" style="display:inline-block;background:#C9A646;color:#000;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;margin-top:8px;">Pulsante</a>`;

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    key: "order_confirmation",
    label: "Conferma ordine",
    trigger: "Al cliente, quando un ordine è confermato: subito per il bonifico, a pagamento riuscito per la carta (Stripe).",
    recipient: "Cliente",
    placeholders: [
      { name: "numero_ordine", description: "Numero dell'ordine", kind: "text", sample: "FMF-20261127-1234" },
      { name: "totale", description: "Totale pagato", kind: "text", sample: "105,90 €" },
      { name: "tabella_prodotti", description: "Elenco prodotti con quantità, prezzi e totale", kind: "block", sample: "<p><i>[tabella prodotti]</i></p>" },
      { name: "dati_bonifico", description: "IBAN e causale (compare solo se il cliente paga con bonifico)", kind: "block", sample: "<p><i>[dati bonifico]</i></p>" },
      { name: "pulsante_ordine", description: "Pulsante \"Vedi il tuo ordine\"", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Ordine confermato {{numero_ordine}} · FMF Cards",
    defaultBody: `<h1 style="font-size:20px;margin:0 0 6px;">Grazie per il tuo ordine!</h1>
<p style="font-size:14px;color:#444;margin:0 0 20px;">Ordine <b>{{numero_ordine}}</b> ricevuto correttamente. Ti aggiorneremo via email a ogni cambio di stato.</p>
{{tabella_prodotti}}
{{dati_bonifico}}
{{pulsante_ordine}}`,
  },
  {
    key: "order_status",
    label: "Aggiornamento stato ordine",
    trigger: "Al cliente, ogni volta che l'admin cambia lo stato di un ordine (es. spedito, consegnato).",
    recipient: "Cliente",
    placeholders: [
      { name: "numero_ordine", description: "Numero dell'ordine", kind: "text", sample: "FMF-20261127-1234" },
      { name: "stato", description: "Nuovo stato, in parole (es. \"Spedito\")", kind: "text", sample: "Spedito" },
      { name: "badge_stato", description: "Etichetta colorata con il nuovo stato", kind: "block", sample: "<span style=\"background:#E3F6E9;color:#15663F;padding:5px 12px;border-radius:999px;font-weight:700;font-size:13px;\">Spedito</span>" },
      { name: "tracking", description: "Corriere e numero di tracking (solo se inseriti)", kind: "block", sample: "<p>Corriere: <b>BRT</b> · Tracking: <b>123456</b></p>" },
      { name: "pulsante_ordine", description: "Pulsante \"Vedi il tuo ordine\"", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Ordine {{numero_ordine}}: {{stato}} · FMF Cards",
    defaultBody: `<h1 style="font-size:20px;margin:0 0 6px;">Il tuo ordine è stato aggiornato</h1>
<p style="font-size:14px;color:#444;margin:0 0 14px;">Ordine <b>{{numero_ordine}}</b></p>
{{badge_stato}}
{{tracking}}
<div style="margin-top:20px;">{{pulsante_ordine}}</div>`,
  },
  {
    key: "payment_failed",
    label: "Pagamento non riuscito",
    trigger:
      "Al cliente, quando un pagamento con carta non va a buon fine o la pagina di pagamento scade senza che sia stato completato.",
    recipient: "Cliente",
    placeholders: [
      { name: "numero_ordine", description: "Numero dell'ordine", kind: "text", sample: "FMF-20261127-1234" },
      { name: "totale", description: "Totale dell'ordine", kind: "text", sample: "105,90 €" },
      { name: "pulsante_riprova", description: "Pulsante per tornare al carrello e riprovare", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Pagamento non completato · ordine {{numero_ordine}}",
    defaultBody: `<h1 ${H1}>Il pagamento non è andato a buon fine</h1>
<p ${P}>
  Non abbiamo ricevuto il pagamento per l'ordine <b>{{numero_ordine}}</b> ({{totale}}), quindi l'ordine non è stato
  confermato e non ti è stato addebitato nulla. Può succedere se la carta è stata rifiutata o se la pagina di
  pagamento è stata chiusa prima di concludere.
</p>
<p ${P}>Puoi riprovare quando vuoi: i prodotti sono ancora nel catalogo, finché disponibili.</p>
{{pulsante_riprova}}`,
  },
  {
    key: "account_welcome",
    label: "Benvenuto (account creato)",
    trigger: "Al cliente, subito dopo la registrazione di un nuovo account.",
    recipient: "Cliente",
    placeholders: [
      { name: "nome", description: "Nome del cliente", kind: "text", sample: "Mario" },
      { name: "pulsante_account", description: "Pulsante \"Vai al tuo account\"", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Benvenuto su FMF Cards, {{nome}}",
    defaultBody: `<h1 ${H1}>Ciao {{nome}}, il tuo account è pronto</h1>
<p ${P}>
  Da ora trovi nel tuo account lo stato di tutti i tuoi ordini con il tracking, gli indirizzi salvati e lo storico
  degli acquisti. I prezzi sono già visibili a tutti: l'account ti serve per tenere tutto in un posto solo.
</p>
{{pulsante_account}}`,
  },
  {
    key: "password_reset",
    label: "Reimposta password",
    trigger: "Al cliente, quando chiede di recuperare la password dalla pagina Account.",
    recipient: "Cliente",
    placeholders: [
      { name: "pulsante", description: "Pulsante \"Reimposta password\" (link valido 1 ora)", kind: "block", sample: SAMPLE_BUTTON },
      { name: "link", description: "Lo stesso link in chiaro, per chi non vede il pulsante", kind: "text", sample: "https://fmfcards.com/reimposta-password?token=..." },
    ],
    defaultSubject: "Reimposta la tua password · FMF Cards",
    defaultBody: `<h1 ${H1}>Reimposta la tua password</h1>
<p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 20px;">
  Hai richiesto di reimpostare la password del tuo account FMF Cards. Il link è valido per 1 ora.
  Se non sei stato tu a fare questa richiesta, ignora questa email: la tua password resterà invariata.
</p>
{{pulsante}}
<p style="font-size:12px;color:#999;margin-top:24px;">Se il pulsante non funziona, copia questo link nel browser:<br /><span style="word-break:break-all;">{{link}}</span></p>`,
  },
  {
    key: "contact_received",
    label: "Messaggio ricevuto (assistenza)",
    trigger: "Al cliente, quando invia un messaggio dal Centro assistenza.",
    recipient: "Cliente",
    placeholders: [],
    defaultSubject: "Messaggio ricevuto · FMF Cards",
    defaultBody: `<h1 ${H1}>Abbiamo ricevuto il tuo messaggio</h1>
<p ${P}>Ti risponderemo il prima possibile, di solito entro 24 ore lavorative (mar-ven 8-19).</p>`,
  },
  {
    key: "reseller_request_received",
    label: "Richiesta rivenditore ricevuta",
    trigger: "A chi invia la richiesta dalla pagina \"Lavora con noi\".",
    recipient: "Cliente",
    placeholders: [{ name: "azienda", description: "Ragione sociale indicata nella richiesta", kind: "text", sample: "Carte Rare S.R.L." }],
    defaultSubject: "Richiesta rivenditore ricevuta · FMF Cards",
    defaultBody: `<h1 ${H1}>Richiesta ricevuta</h1>
<p ${P}>
  Abbiamo ricevuto la richiesta di accesso come rivenditore per <b>{{azienda}}</b>. La valutiamo manualmente
  e ti scriviamo di nuovo appena abbiamo una risposta.
</p>`,
  },
  {
    key: "reseller_approved",
    label: "Richiesta rivenditore approvata",
    trigger: "Al richiedente, quando l'admin approva una richiesta \"Lavora con noi\".",
    recipient: "Cliente",
    placeholders: [
      { name: "azienda", description: "Ragione sociale", kind: "text", sample: "Carte Rare S.R.L." },
      { name: "pulsante_account", description: "Pulsante \"Vai al tuo account\"", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Richiesta rivenditore approvata · FMF Cards",
    defaultBody: `<h1 ${H1}>La tua richiesta è stata accettata</h1>
<p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 20px;">
  Ciao, la richiesta di accesso come rivenditore per <b>{{azienda}}</b> è stata approvata. Accedi
  al tuo account: da ora vedrai (dove previsto) le condizioni dedicate.
</p>
{{pulsante_account}}`,
  },
  {
    key: "reseller_rejected",
    label: "Richiesta rivenditore non approvata",
    trigger: "Al richiedente, quando l'admin rifiuta una richiesta \"Lavora con noi\".",
    recipient: "Cliente",
    placeholders: [
      { name: "azienda", description: "Ragione sociale", kind: "text", sample: "Carte Rare S.R.L." },
      { name: "motivo", description: "Nota inserita dall'admin (può essere vuota)", kind: "text", sample: "Partita IVA non attiva." },
    ],
    defaultSubject: "Richiesta rivenditore · FMF Cards",
    defaultBody: `<h1 ${H1}>Richiesta non approvata</h1>
<p ${P}>
  Ciao, al momento non possiamo accettare la richiesta di accesso come rivenditore per <b>{{azienda}}</b>. {{motivo}}
</p>`,
  },
  {
    key: "admin_new_order",
    label: "Notifica admin: nuovo ordine",
    trigger: "A tutti gli admin, quando arriva un nuovo ordine confermato.",
    recipient: "Admin",
    placeholders: [
      { name: "numero_ordine", description: "Numero dell'ordine", kind: "text", sample: "FMF-20261127-1234" },
      { name: "totale", description: "Totale", kind: "text", sample: "105,90 €" },
      { name: "cliente", description: "Email del cliente", kind: "text", sample: "cliente@example.com" },
      { name: "metodo_pagamento", description: "Carta o bonifico", kind: "text", sample: "Carta" },
      { name: "articoli", description: "Riepilogo articoli in una riga", kind: "text", sample: "1× Booster box Terastal Festival" },
      { name: "pulsante_ordine", description: "Pulsante \"Apri l'ordine\" nella dashboard", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Nuovo ordine {{numero_ordine}} · {{totale}}",
    defaultBody: `<h1 ${H1}>Nuovo ordine ricevuto</h1>
<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px;">
  Ordine <b>{{numero_ordine}}</b> · Totale <b>{{totale}}</b><br />
  Cliente: {{cliente}}<br />
  Pagamento: {{metodo_pagamento}}<br />
  Articoli: {{articoli}}
</p>
{{pulsante_ordine}}`,
  },
  {
    key: "admin_new_contact",
    label: "Notifica admin: nuovo messaggio",
    trigger: "A tutti gli admin, quando un cliente scrive dal Centro assistenza.",
    recipient: "Admin",
    placeholders: [
      { name: "cliente", description: "Email del cliente", kind: "text", sample: "cliente@example.com" },
      { name: "numero_ordine", description: "Ordine indicato dal cliente (può essere vuoto)", kind: "text", sample: "FMF-20261127-1234" },
      { name: "messaggio", description: "Testo del messaggio", kind: "text", sample: "Buongiorno, quando arriva il mio ordine?" },
      { name: "pulsante", description: "Pulsante \"Apri i messaggi\"", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Nuovo messaggio da {{cliente}}",
    defaultBody: `<h1 ${H1}>Nuovo messaggio dal Centro assistenza</h1>
<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px;">Da: {{cliente}}<br />Ordine: <b>{{numero_ordine}}</b></p>
<div style="padding:14px 16px;background:#F7F7F7;border-radius:10px;font-size:14px;color:#333;white-space:pre-wrap;">{{messaggio}}</div>
{{pulsante}}`,
  },
  {
    key: "admin_new_reseller_request",
    label: "Notifica admin: nuova richiesta rivenditore",
    trigger: "A tutti gli admin, quando arriva una richiesta da \"Lavora con noi\".",
    recipient: "Admin",
    placeholders: [
      { name: "azienda", description: "Ragione sociale", kind: "text", sample: "Carte Rare S.R.L." },
      { name: "partita_iva", description: "Partita IVA", kind: "text", sample: "01234567890" },
      { name: "referente", description: "Nome del referente", kind: "text", sample: "Mario Rossi" },
      { name: "email", description: "Email del richiedente", kind: "text", sample: "info@carterare.it" },
      { name: "pulsante", description: "Pulsante \"Valuta la richiesta\"", kind: "block", sample: SAMPLE_BUTTON },
    ],
    defaultSubject: "Nuova richiesta rivenditore · {{azienda}}",
    defaultBody: `<h1 ${H1}>Nuova richiesta rivenditore</h1>
<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px;">
  Azienda: <b>{{azienda}}</b><br />
  P.IVA: {{partita_iva}}<br />
  Referente: {{referente}}<br />
  Email: {{email}}
</p>
{{pulsante}}`,
  },
];

export function getTemplateDef(key: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => (name in values ? values[name] : match));
}

/**
 * Restituisce oggetto e corpo pronti per l'invio. `text` = dati da mettere in sicurezza,
 * `blocks` = HTML generato dal sito. Se il database non risponde si usa il testo
 * predefinito: un'email automatica non deve mai saltare per colpa della personalizzazione.
 */
export async function renderEmailTemplate(
  key: string,
  values: { text?: Record<string, string>; blocks?: Record<string, string> }
): Promise<{ subject: string; bodyHtml: string }> {
  const def = getTemplateDef(key);
  if (!def) throw new Error(`Modello email sconosciuto: ${key}`);

  let subjectTpl = def.defaultSubject;
  let bodyTpl = def.defaultBody;
  try {
    const custom = await prisma.emailTemplate.findUnique({ where: { key } });
    if (custom) {
      subjectTpl = custom.subject;
      bodyTpl = custom.bodyHtml;
    }
  } catch (err) {
    console.error(`[email] modello personalizzato "${key}" non leggibile, uso il predefinito:`, err);
  }

  const text = values.text ?? {};
  const blocks = values.blocks ?? {};
  const escapedText = Object.fromEntries(Object.entries(text).map(([k, v]) => [k, escapeHtml(v)]));

  // Nell'oggetto (testo semplice) i blocchi HTML non hanno senso: si eliminano.
  const subject = fill(subjectTpl, { ...Object.fromEntries(Object.keys(blocks).map((k) => [k, ""])), ...text }).trim();
  const bodyHtml = fill(bodyTpl, { ...escapedText, ...blocks });
  return { subject, bodyHtml };
}

/** Valori d'esempio per l'invio di prova dall'admin. */
export function sampleValues(def: EmailTemplateDef): { text: Record<string, string>; blocks: Record<string, string> } {
  const text: Record<string, string> = {};
  const blocks: Record<string, string> = {};
  for (const p of def.placeholders) {
    if (p.kind === "text") text[p.name] = p.sample;
    else blocks[p.name] = p.sample;
  }
  return { text, blocks };
}
