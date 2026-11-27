/**
 * Quali immagini può ottimizzare Next (ridimensionamento per schermo + WebP/AVIF).
 *
 * Le immagini locali (/products-cutout/..., /products/...) si ottimizzano sempre.
 * Per quelle remote Next pretende che il dominio sia autorizzato in next.config:
 * autorizziamo Vercel Blob, dove finiscono le foto caricate dall'admin. Un indirizzo
 * incollato a mano da un altro sito non è autorizzabile in anticipo, quindi quello
 * resta servito così com'è (nessuna ottimizzazione, ma almeno si vede).
 */
const OPTIMIZABLE_REMOTE_HOSTS = [/\.public\.blob\.vercel-storage\.com$/i];

export function isOptimizableImage(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return true; // immagine locale servita dal sito
  try {
    const host = new URL(url).hostname;
    return OPTIMIZABLE_REMOTE_HOSTS.some((re) => re.test(host));
  } catch {
    return false;
  }
}
