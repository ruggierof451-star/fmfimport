import type { Game, Language } from "@/generated/prisma";
import { GAME_LABEL, LANG_LABEL, LIST_META } from "@/lib/catalog";
import { formatEuro } from "@/lib/pricing";
import { cleanProductName } from "@/lib/product-art";

/**
 * Testi SEO di categorie e prodotti: un solo posto per title, meta description e testo
 * alternativo delle immagini, così pagine, dati strutturati e feed Merchant Center dicono
 * sempre la stessa cosa.
 *
 * I title delle categorie sono "assoluti" (non passano dal modello "%s · FMF Cards" del
 * layout) e restano sotto i ~60 caratteri; le description sotto i ~155.
 */
export const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  "pokemon-it": {
    title: "Carte Pokémon Italiane | Box, ETB e Collection - FMF Cards",
    description:
      "Booster box, Elite Trainer Box e collection Pokémon in italiano, originali e sigillati. Prezzi visibili senza registrazione e spedizione con tracking.",
  },
  "pokemon-jp": {
    title: "Carte Pokémon Giapponesi | Box e Display - FMF Cards",
    description:
      "Booster box e display Pokémon giapponesi originali, disponibili con o senza pellicola. Importazione diretta, prezzi chiari e spedizione in tutta Italia.",
  },
  "pokemon-cn": {
    title: "Carte Pokémon Cinesi | Box, Display e Gift Box - FMF Cards",
    description:
      "Booster box, display, gift box e coin display Pokémon in edizione cinese, originali e sigillati. Prezzi visibili a tutti, spedizione con tracking.",
  },
  "pokemon-kr": {
    title: "Carte Pokémon Coreane | Booster Box - FMF Cards",
    description:
      "Booster box Pokémon in edizione coreana, originali e sigillati, importati per i collezionisti italiani. Prezzi chiari e spedizione con tracking.",
  },
  "one-piece-jp": {
    title: "Carte One Piece Giapponesi | Box e Display - FMF Cards",
    description:
      "Booster box, Extra Booster e prodotti One Piece Card Game in giapponese, originali e sigillati. Prezzi visibili senza registrazione.",
  },
  "one-piece-cn": {
    title: "Carte One Piece Cinesi | Booster e Slim Box - FMF Cards",
    description:
      "Booster box e slim box One Piece Card Game in edizione cinese, originali e sigillati. Prezzi chiari per tutti e spedizione con tracking.",
  },
  "altri-tcg": {
    title: "Altri TCG | Yu-Gi-Oh! e Dragon Ball Sigillati - FMF Cards",
    description:
      "Yu-Gi-Oh! e Dragon Ball Super Card Game: booster box e prodotti sigillati, edizione giapponese e inglese. Prezzi chiari e spedizione con tracking.",
  },
  yugioh: {
    title: "Carte Yu-Gi-Oh! | Booster Box Sigillati - FMF Cards",
    description:
      "Booster box e prodotti sigillati Yu-Gi-Oh! in edizione giapponese e inglese, originali da distribuzione autorizzata. Spedizione con tracking.",
  },
  "dragon-ball": {
    title: "Carte Dragon Ball Super | Booster Box - FMF Cards",
    description:
      "Booster box e prodotti sigillati Dragon Ball Super Card Game in giapponese e inglese, originali. Prezzi visibili e spedizione in tutta Italia.",
  },
  "carte-singole": {
    title: "Carte Singole Collezionabili | Gradate e Raw - FMF Cards",
    description:
      "Carte singole da collezione: gradate in slab e raw non gradate. Prezzi visibili a tutti, spedizione protetta con tracking.",
  },
  "carte-singole-gradate": {
    title: "Carte Gradate | Slab PSA e altri enti - FMF Cards",
    description:
      "Carte singole valutate da un ente di grading e sigillate in slab. Prezzo chiaro e spedizione protetta con tracking.",
  },
  "carte-singole-raw": {
    title: "Carte Singole Raw (Non Gradate) - FMF Cards",
    description:
      "Carte singole non gradate, così come escono dalla busta, per completare la tua collezione. Spedizione protetta con tracking.",
  },
  pokemon: {
    title: "Carte Pokémon | Italiano, Giapponese, Cinese e Coreano - FMF Cards",
    description:
      "Tutto il catalogo Pokémon TCG: booster box, display, ETB e collection in italiano, giapponese, cinese e coreano. Originali e sigillati.",
  },
  onepiece: {
    title: "Carte One Piece Card Game | Giapponese e Cinese - FMF Cards",
    description:
      "Tutto il catalogo One Piece Card Game: booster box, Extra Booster e slim box in giapponese e cinese. Originali e sigillati.",
  },
  novita: {
    title: "Novità TCG | Ultimi Arrivi Pokémon e One Piece - FMF Cards",
    description:
      "Gli ultimi prodotti arrivati su FMF Cards: nuove espansioni Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball, originali e sigillati.",
  },
  "piu-venduti": {
    title: "Più Venduti | Box e Display TCG - FMF Cards",
    description:
      "I box e i display più acquistati su FMF Cards negli ultimi 30 giorni, calcolati sugli ordini reali. Pokémon, One Piece e altri TCG.",
  },
  preordini: {
    title: "Preordini TCG | Prodotti in arrivo da prenotare - FMF Cards",
    description:
      "Preordina le nuove uscite Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball: prenoti ora e ricevi il prodotto appena disponibile. Data di uscita indicata.",
  },
  offerte: {
    title: "Offerte e Promozioni TCG - FMF Cards",
    description:
      "Prodotti TCG in offerta su FMF Cards: box e display Pokémon, One Piece e altri giochi a prezzo ridotto, finché disponibili.",
  },
};

/** Title e description SEO di una categoria (con ripiego sui testi del catalogo). */
export function categorySeo(key: string): { title: string; description: string } | null {
  const seo = CATEGORY_SEO[key];
  if (seo) return seo;
  const meta = LIST_META[key];
  return meta ? { title: `${meta.title} - FMF Cards`, description: meta.description } : null;
}

const LANG_ADJ: Record<Language, string> = {
  IT: "italiana",
  JP: "giapponese",
  CN: "cinese",
  KR: "coreana",
  EN: "inglese",
};

/** Categoria per lingua più specifica che contiene il prodotto (per breadcrumb e link interni). */
export function languageListKeyFor(game: Game, language: Language): string | null {
  const key =
    game === "POKEMON"
      ? `pokemon-${language.toLowerCase()}`
      : game === "ONE_PIECE"
        ? `one-piece-${language.toLowerCase()}`
        : game === "YUGIOH"
          ? "yugioh"
          : "dragon-ball";
  return LIST_META[key] ? key : null;
}

/** Categoria del gioco (pagina "madre" della lingua). */
export function gameListKeyFor(game: Game): string {
  return game === "POKEMON" ? "pokemon" : game === "ONE_PIECE" ? "onepiece" : "altri-tcg";
}

type SeoProduct = {
  name: string;
  game: Game;
  language: Language;
  type: string;
  setName: string;
  condition: "NEW" | "B_GRADE";
};

/** "Booster box Pokémon giapponese" — descrizione breve e naturale, usata in alt e testi. */
export function productKind(p: SeoProduct): string {
  return `${p.type} ${GAME_LABEL[p.game]} ${LANG_LABEL[p.language].toLowerCase()}`;
}

/** Testo alternativo della foto prodotto: nome + tipo, gioco e lingua (senza ripetizioni). */
export function productImageAlt(p: SeoProduct): string {
  const name = cleanProductName(p.name);
  const kind = productKind(p);
  return name.toLowerCase().includes(p.type.toLowerCase()) ? `${name} – ${GAME_LABEL[p.game]} ${LANG_LABEL[p.language].toLowerCase()}` : `${name} – ${kind}`;
}

/** Title della scheda prodotto (il layout aggiunge " · FMF Cards"). */
export function productTitle(p: SeoProduct): string {
  const name = cleanProductName(p.name);
  const suffix = `${GAME_LABEL[p.game]} ${LANG_LABEL[p.language]}`;
  return name.toLowerCase().includes(GAME_LABEL[p.game].toLowerCase()) ? name : `${name} | ${suffix}`;
}

/**
 * Meta description della scheda prodotto, costruita solo con dati reali: nome, tipo,
 * gioco, lingua, espansione, condizione, prezzo e disponibilità attuali.
 */
export function productDescription(
  p: SeoProduct,
  opts: { priceCents: number | null; soldOut: boolean; isPreorder: boolean }
): string {
  const name = cleanProductName(p.name);
  const parts: string[] = [];
  const set = p.setName && !name.toLowerCase().includes(p.setName.toLowerCase()) ? ` dell'espansione ${p.setName}` : "";
  parts.push(`${name}: ${p.type} ${GAME_LABEL[p.game]}${set} in edizione ${LANG_ADJ[p.language]}.`);
  parts.push(p.condition === "B_GRADE" ? "Contenuto sigillato, confezione esterna con lievi imperfezioni (B-Grade)." : "Prodotto originale e sigillato.");
  if (opts.priceCents != null) {
    const price = formatEuro(opts.priceCents);
    parts.push(opts.isPreorder ? `In preordine a ${price}.` : opts.soldOut ? `Prezzo ${price}, al momento esaurito.` : `Prezzo ${price}, spedizione con tracking.`);
  }
  return parts.join(" ");
}

/**
 * Crumb "madre" di una categoria per i breadcrumb: le liste per lingua (pokemon-jp,
 * one-piece-cn, ...) stanno sotto la pagina del gioco; le altre non hanno un livello
 * intermedio. Restituisce un array (0 o 1 elemento) da inserire tra Home e la categoria.
 */
export function categoryParentCrumb(key: string): { name: string; path: string }[] {
  const parents: Record<string, string> = {
    "pokemon-it": "pokemon",
    "pokemon-jp": "pokemon",
    "pokemon-cn": "pokemon",
    "pokemon-kr": "pokemon",
    "one-piece-jp": "onepiece",
    "one-piece-cn": "onepiece",
    "carte-singole-gradate": "carte-singole",
    "carte-singole-raw": "carte-singole",
    yugioh: "altri-tcg",
    "dragon-ball": "altri-tcg",
  };
  const parent = parents[key];
  return parent && LIST_META[parent] ? [{ name: LIST_META[parent].title, path: `/${parent}` }] : [];
}
