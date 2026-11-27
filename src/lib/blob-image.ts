/**
 * Foto prodotto su un archivio Vercel Blob PRIVATO.
 *
 * Gli indirizzi copiati dalla dashboard di Vercel hanno un permesso temporaneo
 * (?vercel-blob-delegation=…) che scade dopo circa 12 ore: salvati così, le foto
 * smettono di vedersi. Il sito quindi le serve sempre dal proprio indirizzo
 * /img/<percorso>, che le legge dall'archivio con la chiave del progetto.
 */
const PRIVATE_BLOB_HOST = /\.private\.blob\.vercel-storage\.com$/i;

export function isPrivateBlobUrl(url: string): boolean {
  try {
    return PRIVATE_BLOB_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Indirizzo da mostrare nel sito: le foto private passano da /img/…, le altre restano com'erano. */
export function displayImageUrl(url: string): string {
  if (!isPrivateBlobUrl(url)) return url;
  const { pathname } = new URL(url);
  return `/img${pathname}`;
}
