/**
 * Quali immagini può ottimizzare Next (ridimensionamento per schermo + WebP/AVIF).
 *
 * Le foto caricate dall'admin sono servite dal sito stesso (/immagini/<id>, conservate
 * nel database), quindi sono sempre ottimizzabili, come tutte le immagini locali.
 * Un indirizzo incollato da un altro sito no: Next ottimizza un dominio esterno solo se
 * è autorizzato in next.config, e non si possono autorizzare in anticipo domini
 * arbitrari. Quelle immagini vengono quindi mostrate così come sono.
 *
 * Deve restare coerente con `images.remotePatterns` in next.config.ts: dire qui che
 * un'immagine è ottimizzabile senza averla autorizzata là la farebbe fallire.
 */
export function isOptimizableImage(url: string): boolean {
  return !/^https?:\/\//i.test(url);
}
