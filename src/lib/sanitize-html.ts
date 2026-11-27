/**
 * Sanificazione minima dell'HTML della descrizione prodotto, inserito dall'admin e poi
 * mostrato a tutti i visitatori con dangerouslySetInnerHTML. Anche se solo un admin può
 * scriverlo, serve una rete di sicurezza: se un account admin venisse compromesso, senza
 * questo filtro un testo con <script> diventerebbe un attacco (XSS memorizzato) su ogni
 * scheda prodotto.
 *
 * Approccio a lista bianca di tag e attributi "sicuri" per la formattazione del testo.
 * Non è un parser DOM completo (qui gira anche lato server, senza browser), ma rimuove in
 * modo robusto gli elementi e gli attributi pericolosi.
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li",
  "a", "h2", "h3", "h4", "blockquote", "span", "hr",
]);

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let html = input
    // Elimina del tutto blocchi pericolosi insieme al loro contenuto.
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|math|link|meta|base)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|math|link|meta|base)\b[^>]*\/?\s*>/gi, "")
    // Rimuove i commenti (possono nascondere condizioni IE o payload).
    .replace(/<!--[\s\S]*?-->/g, "");

  // Filtra ogni tag: tiene solo quelli in lista bianca, ripulendone gli attributi.
  html = html.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_m, slash: string, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (slash) return `</${name}>`;
    return `<${name}${safeAttributes(name, attrs)}>`;
  });

  return html;
}

function safeAttributes(tag: string, attrs: string): string {
  // Solo i link possono avere href; nient'altro porta attributi (niente on*, style, src...).
  if (tag !== "a") return "";
  const match = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const raw = match ? (match[2] ?? match[3] ?? match[4] ?? "") : "";
  const href = raw.trim();
  // Consente solo http(s), mailto e percorsi interni; blocca javascript:, data:, ecc.
  const safe = /^(https?:\/\/|mailto:|\/)/i.test(href) && !/^javascript:/i.test(href);
  if (!safe) return "";
  const escaped = href.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return ` href="${escaped}" rel="nofollow noopener noreferrer" target="_blank"`;
}
