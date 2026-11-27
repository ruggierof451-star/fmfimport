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

/**
 * Logo mostrato da Google accanto al sito (risultati di ricerca e scheda dell'attività).
 * Deve essere pubblicamente raggiungibile e su sfondo pieno, non trasparente: per questo
 * esiste una variante apposta (scritta nera su bianco).
 */
export const GOOGLE_LOGO = { path: "/fmf-cards-logo-google.png", width: 697, height: 330 };

/**
 * Percorso di navigazione (schema.org BreadcrumbList): dice a Google come è organizzato
 * il sito e gli permette di mostrare il percorso al posto dell'indirizzo nei risultati.
 * È anche uno dei segnali che usa per decidere se mostrare i collegamenti alle sezioni
 * sotto al risultato principale (quelli non si possono richiedere: li sceglie Google).
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Scheda dell'attività per Google (schema.org Organization). */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    "@id": `${absoluteUrl("/")}#organizzazione`,
    name: SITE_NAME,
    description:
      "Negozio online di carte collezionabili e prodotti TCG sigillati: Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball, in edizione italiana e di importazione.",
    legalName: "FMF Cards S.R.L.S.",
    url: absoluteUrl("/"),
    email: "fmfcardssrls@gmail.com",
    telephone: "+39 333 300 9760",
    areaServed: "IT",
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(GOOGLE_LOGO.path),
      width: GOOGLE_LOGO.width,
      height: GOOGLE_LOGO.height,
    },
    image: absoluteUrl(GOOGLE_LOGO.path),
    vatID: "IT11105221219",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Traversa Garibaldi 24",
      postalCode: "80040",
      addressLocality: "Striano",
      addressRegion: "NA",
      addressCountry: "IT",
    },
  };
}

/** Metadati per le pagine private o di servizio: mai in Google. */
export const NOINDEX = { index: false, follow: false } as const;
