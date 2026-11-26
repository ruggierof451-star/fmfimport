import { prisma } from "@/lib/prisma";
import { Prisma, Game, Language, PackagingCondition } from "@/generated/prisma";
import { unitPriceCentsFor } from "@/lib/pricing";

export const GAME_LABEL: Record<Game, string> = {
  POKEMON: "Pokémon",
  ONE_PIECE: "One Piece",
  YUGIOH: "Yu-Gi-Oh!",
  DRAGON_BALL: "Dragon Ball",
};
export const LANG_LABEL: Record<Language, string> = {
  IT: "Italiano",
  JP: "Giapponese",
  CN: "Cinese",
  KR: "Coreano",
  EN: "Inglese",
};
// Categorie per cui ha senso mostrare la confezione (box giapponesi, venduti in più varianti).
export const JP_PACKAGING_CATEGORIES = new Set(["pokemon-jp", "one-piece-jp"]);

export const PACKAGING_LABEL: Record<PackagingCondition, string> = {
  SEALED: "Con pellicola",
  NO_WRAP: "Senza pellicola",
  DAMAGED: "Danneggiato",
};

export const NAV: { key: string; label: string }[] = [
  { key: "novita", label: "Novità" },
  { key: "pokemon-it", label: "Pokémon IT" },
  { key: "pokemon-jp", label: "Pokémon JP" },
  { key: "pokemon-cn", label: "Pokémon CN" },
  { key: "pokemon-kr", label: "Pokémon KR" },
  { key: "one-piece-jp", label: "One Piece JP" },
  { key: "one-piece-cn", label: "One Piece CN" },
  { key: "yugioh", label: "Yu-Gi-Oh!" },
  { key: "dragon-ball", label: "Dragon Ball" },
];

export interface ListMeta {
  title: string;
  description: string;
  where: Prisma.ProductWhereInput;
  /** Messaggio da mostrare quando il filtro principale non produce risultati e si ricade su un fallback. */
  emptyFallbackMessage?: string;
  fallbackWhere?: Prisma.ProductWhereInput;
  segment?: { key: string; label: string }[];
}

// Non trattiamo prodotti B-Grade: esclusi sempre dal catalogo pubblico, qualunque sia lo stato di pubblicazione.
const PUBLISHED: Prisma.ProductWhereInput = { published: true, condition: "NEW", archived: false, deletedAt: null };

const POKEMON_SEGMENT = [
  { key: "pokemon-it", label: "Italiano" },
  { key: "pokemon-jp", label: "Giapponese" },
  { key: "pokemon-cn", label: "Cinese" },
  { key: "pokemon-kr", label: "Coreano" },
];

export const LIST_META: Record<string, ListMeta> = {
  "pokemon-it": {
    title: "Pokémon IT",
    description: "Booster box e prodotti sigillati Pokémon in edizione italiana.",
    where: { category: "pokemon-it" },
    segment: POKEMON_SEGMENT,
  },
  "pokemon-jp": {
    title: "Pokémon JP",
    description: "Booster box e special box Pokémon in edizione giapponese.",
    where: { category: "pokemon-jp" },
    segment: POKEMON_SEGMENT,
  },
  "pokemon-cn": {
    title: "Pokémon CN",
    description: "Booster box, display, gift box e coin display Pokémon in edizione cinese.",
    where: { category: "pokemon-cn" },
    segment: POKEMON_SEGMENT,
  },
  "pokemon-kr": {
    title: "Pokémon KR",
    description: "Booster box Pokémon in edizione coreana.",
    where: { category: "pokemon-kr" },
    segment: POKEMON_SEGMENT,
  },
  "one-piece-jp": {
    title: "One Piece JP",
    description: "Booster box, Extra Booster, promo e accessori One Piece in edizione giapponese.",
    where: { category: "one-piece-jp" },
    segment: [
      { key: "one-piece-jp", label: "Giapponese" },
      { key: "one-piece-cn", label: "Cinese" },
    ],
  },
  "one-piece-cn": {
    title: "One Piece CN",
    description: "Booster box e slim box One Piece in edizione cinese.",
    where: { category: "one-piece-cn" },
    segment: [
      { key: "one-piece-jp", label: "Giapponese" },
      { key: "one-piece-cn", label: "Cinese" },
    ],
  },
  yugioh: {
    title: "Yu-Gi-Oh!",
    description: "Booster box e prodotti sigillati Yu-Gi-Oh!, edizione giapponese e inglese.",
    where: { category: "yugioh" },
  },
  "dragon-ball": {
    title: "Dragon Ball",
    description: "Booster box e prodotti sigillati Dragon Ball Super Card Game, edizione giapponese e inglese.",
    where: { category: "dragon-ball" },
  },
  pokemon: {
    title: "Pokémon TCG",
    description: "Tutto il catalogo Pokémon: italiano, giapponese, cinese e coreano.",
    where: { game: "POKEMON" },
  },
  onepiece: {
    title: "One Piece Card Game",
    description: "Tutto il catalogo One Piece: giapponese e cinese.",
    where: { game: "ONE_PIECE" },
  },
  novita: {
    title: "Novità",
    description: "Gli ultimi prodotti inseriti nel catalogo, per ogni gioco e lingua.",
    where: { isNew: true },
  },
  "piu-venduti": {
    title: "Più venduti",
    description: "La classifica si calcola sugli ordini reali degli ultimi 30 giorni.",
    where: { id: "__none__" }, // nessun ordine reale ancora: nessun risultato finché non c'è storico vendite
    emptyFallbackMessage:
      "La classifica comparirà con i primi ordini. Intanto trovi qui sotto i prodotti appena arrivati.",
    fallbackWhere: { isNew: true },
  },
  offerte: {
    title: "Offerte",
    description:
      "Mostriamo solo ribassi reali, con il prezzo più basso degli ultimi 30 giorni accanto allo sconto.",
    where: { id: "__none__" },
    emptyFallbackMessage: "Nessuna offerta attiva in questo momento.",
  },
};

export interface CatalogFilters {
  games?: string[];
  langs?: string[];
  types?: string[];
  priceBand?: "all" | "a" | "b" | "c" | "d";
  sort?: "rel" | "asc" | "desc" | "name";
  q?: string;
  page?: number;
  pageSize?: number;
}

export const PRICE_BANDS: Record<string, [number, number, string]> = {
  all: [0, Infinity, "Tutti i prezzi"],
  a: [0, 50, "Fino a 50 €"],
  b: [50, 100, "50 – 100 €"],
  c: [100, 200, "100 – 200 €"],
  d: [200, Infinity, "Oltre 200 €"],
};

function searchWhere(q: string): Prisma.ProductWhereInput {
  const terms = q.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return {};
  return {
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term } },
        { setName: { contains: term } },
        { setCode: { contains: term } },
        { supplierCode: { contains: term } },
        { type: { contains: term } },
      ],
    })),
  };
}

/**
 * Esegue la query del catalogo per una pagina di listing (categoria o ricerca) applicando
 * i filtri combinabili. I prezzi sono calcolati qui, server-side, dal costo + regole correnti:
 * non sono mai letti da un valore già calcolato lato client.
 */
export async function listCatalog(key: string, filters: CatalogFilters, isReseller = false) {
  const meta: ListMeta =
    key === "cerca"
      ? { title: "Risultati di ricerca", description: "", where: searchWhere(filters.q ?? "") }
      : LIST_META[key];
  if (!meta) throw new Error(`Categoria sconosciuta: ${key}`);

  const combinable: Prisma.ProductWhereInput = {
    ...(filters.games?.length ? { game: { in: filters.games.map((g) => g.toUpperCase()) as Game[] } } : {}),
    ...(filters.langs?.length ? { language: { in: filters.langs.map((l) => l.toUpperCase()) as Language[] } } : {}),
    ...(filters.types?.length ? { type: { in: filters.types } } : {}),
  };

  let where: Prisma.ProductWhereInput = { AND: [PUBLISHED, meta.where, combinable] };
  let all = await prisma.product.findMany({ where });
  let usedFallback = false;

  if (!all.length && meta.fallbackWhere) {
    where = { AND: [PUBLISHED, meta.fallbackWhere, combinable] };
    all = await prisma.product.findMany({ where });
    usedFallback = true;
  }

  const band = PRICE_BANDS[filters.priceBand ?? "all"];
  const withPrice = all.map((p) => ({
    product: p,
    price: unitPriceCentsFor(p, isReseller),
  }));
  let filtered = withPrice.filter(({ price }) => price / 100 >= band[0] && price / 100 < band[1]);

  const sort = filters.sort ?? "rel";
  filtered = filtered.slice().sort((a, b) => {
    if (sort === "asc") return a.price - b.price;
    if (sort === "desc") return b.price - a.price;
    if (sort === "name") return a.product.setName.localeCompare(b.product.setName);
    // rel: novità prima, poi non-bgrade prima
    return (
      Number(b.product.isNew) - Number(a.product.isNew) ||
      Number(a.product.condition === "B_GRADE") - Number(b.product.condition === "B_GRADE")
    );
  });

  const pageSize = filters.pageSize ?? 24;
  const page = filters.page ?? 1;
  const paged = filtered.slice(0, page * pageSize);

  const availableTypes = [...new Set(all.map((p) => p.type))].sort();
  const availableGames = new Set(all.map((p) => p.game));
  const availableLangs = new Set(all.map((p) => p.language));

  return {
    meta,
    usedFallback,
    total: filtered.length,
    shown: paged,
    hasMore: filtered.length > paged.length,
    availableTypes,
    manyGames: availableGames.size > 1,
    manyLangs: availableLangs.size > 1,
    isReseller,
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug } });
}

export async function getRelatedProducts(product: { id: string; game: Game; language: Language; type: string }) {
  return prisma.product.findMany({
    where: {
      id: { not: product.id },
      game: product.game,
      language: product.language,
      type: product.type,
      published: true,
    },
    take: 4,
  });
}

export async function getTwinEditions(product: { id: string; game: Game; setName: string }) {
  return prisma.product.findMany({
    where: {
      id: { not: product.id },
      game: product.game,
      setName: product.setName,
      published: true,
    },
  });
}
