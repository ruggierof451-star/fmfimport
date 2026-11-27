/**
 * Dominio pubblico ufficiale del sito, usato per SEO: sitemap, robots.txt, canonical,
 * Open Graph e dati strutturati. È volutamente fisso e separato da SITE_URL (che resta
 * per email e ritorni dal pagamento) così che nessun URL indicizzabile possa mai
 * puntare al dominio tecnico di Vercel. Il redirect degli altri host verso questo
 * dominio è in src/proxy.ts.
 */
export const CANONICAL_ORIGIN = "https://www.fmfcards.com";
export const CANONICAL_HOST = "www.fmfcards.com";
export const SITE_NAME = "FMF Cards";

/** URL assoluto sul dominio ufficiale per un percorso del sito (es. "/prodotto/abc"). */
export function absoluteUrl(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_ORIGIN}${clean === "/" ? "/" : clean.replace(/\/+$/, "")}`;
}

/** Pagine informative pubbliche (indicizzabili), incluse nella sitemap. */
export const PUBLIC_INFO_PATHS = [
  "/spedizioni",
  "/resi",
  "/privacy",
  "/condizioni",
  "/cookie",
  "/chi-siamo",
  "/come-funziona",
  "/contatti",
  "/assistenza",
  "/lavora-con-noi",
] as const;

/**
 * Immagine di condivisione predefinita (anteprima su WhatsApp, Facebook, ecc.). In Next i
 * metadati openGraph di una pagina sostituiscono quelli del layout, quindi ogni pagina
 * che imposta openGraph deve includere di nuovo l'immagine: per questo è una costante.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/og-fmfcards.png",
  width: 1200,
  height: 630,
  alt: "FMF Cards — Pokémon e One Piece sigillati, prezzi chiari per tutti",
};

/** Metadati per le pagine private o di servizio: mai in Google. */
export const NOINDEX = { index: false, follow: false } as const;
