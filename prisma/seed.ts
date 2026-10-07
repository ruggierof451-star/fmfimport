/**
 * Seed del catalogo iniziale.
 *
 * I nomi prodotto qui sotto sono gli stessi ~250 titoli pubblici Toreca Import già
 * presenti nel prototipo grafico (fmf-import.html, letti il 2026-10-07). Sono nomi
 * e classificazioni reali; i COSTI sono invece STIME (vedi estCost), perché non
 * abbiamo ancora un listino fornitore reale collegato. Ogni prodotto creato da questo
 * seed ha costIsEstimated=true e matchStatus=UNMATCHED: va considerato "da verificare"
 * finché un'importazione CSV/XLSX o un abbinamento manuale non porta un costo reale.
 */
import { PrismaClient, Game, Language, Condition } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

const RAW: Record<string, string[]> = {
  pkjp: [
    "Glory of Team Rocket Booster Box JP", "Mega Symphonia Booster Box JP", "Mega Brave Booster Box JP", "Pokémon Munikis Zero Booster Box JP", "Pokémon Stellar Miracle Booster Box Japanese", "Ancient Roar Booster Box JP", "Cyber Judge Booster Box JP", "Night Wanderer Booster Box JP", "Pokémon Center Fukuoka Special Box JP", "Pokémon Center Tohoku Special Box JP", "Pokémon Center Hiroshima Special Box JP", "Pokémon Abyss Eye Booster Box JP", "Raging Surf Booster Box JP", "151 Booster Box JP", "Inferno X Booster Box JP", "Shiny Treasure ex Booster Box JP", "White Flare Booster Box JP", "Terastal Festival ex Booster Box JP", "Black Bolt Booster Box JP", "Pokémon Mega Dream Ex Booster Box JP",
    "Pokémon Battle Partners Booster Box Japanese", "VSTAR Universe Booster Box JP", "Future Flash Booster Box JP", "Pokémon Ninja Spinner Booster Box JP", "Pokemon Wild Force Booster Box JP", "Pokemon Snow Hazard Booster Box JP", "Pokemon Clay Burst Booster Box JP", "Mask of Change Booster Box JP", "Pokemon Storm Emeralda Booster Box JP", "Pokemon 30th Celebration Booster Box JP", "Pokemon 30th Celebration Premium Deck Set JP"
  ],
  pkcn: [
    "Pokemon TCG Nuzzle Cheeks Plush Blind Box", "Pokémon 151 Gathering Slim Booster Box CN", "Pokémon 30th Anniversary First Partner Vol. 1 DISPLAY CN", "Pokemon Return of the Dragon Ultra Necrozma CSFM1 CN", "Pokemon Return of the Dragon Rayquaza CSFM2 CN", "Pokemon 151 First Partner Gift Box Charmander CN", "Pokemon 151 First Partner Gift Box Squirtle CN", "Pokemon Pikachu V-UNION Card Frame Collector Box CS0G DISPLAY CN", "Pokemon Terastal Gathering Espeon Coin Display CN", "Pokemon Terastal Gathering Sylveon Coin Display CN", "Pokemon Terastal Gathering Glaceon Coin Display CN", "Pokemon Terastal Gathering Leafeon Coin Display CN", "Pokemon Terastal Gathering Eevee Gift Box Set CN", "Pokemon Terastal Gathering Vaporeon Gift Box Set CN", "Pokemon Terastal Gathering Flareon Gift Box Set CN", "Pokemon Terastal Gathering Jolteon Gift Box Set CN", "Pokemon Terastal Gathering Espeon Gift Box Set CN", "Pokemon Terastal Gathering Glaceon Gift Box Set CN", "Pokemon Terastal Gathering Leafeon Gift Box Set CN", "Pokemon Terastal Gathering Tin Box DISPLAY CN",
    "Pokemon Terastal Gathering Vaporeon Tin Box DISPLAY CN", "Pokemon Terastal Gathering Flareon Tin Box DISPLAY CN", "Pokemon Terastal Gathering Espeon Tin Box DISPLAY CN", "Pokemon Terastal Gathering Sylveon Tin Box DISPLAY CN", "Pokemon Terastal Gathering Glaceon Tin Box DISPLAY CN", "Pokemon Terastal Gathering Leafeon Tin Box DISPLAY CN", "Pokemon Terastal Gathering Eevee and Friends Gift Box CN", "Pokemon Terastal Gathering Quicksand Charm SINGLE BOX CN", "Pokemon Chasing Glory Together Jumbo Booster Box CSV10C CN", "Pokemon Nine Colors Jumbo Boxes Bundle CN", "Pokémon 30th Anniversary First Partner Vol. 2 DISPLAY CN", "Pokémon Dream Painting Vol.3 Eevee And Friends DISPLAY CN", "Pokémon 30th Anniversary First Partner Vol. 3 DISPLAY CN", "Pokemon 2026 Chinese New Year Gift Box CN", "Pókemon Gem Pack Vol.2 Booster Box CN", "Pokémon Gem Pack Vol.6 Booster Box CN", "Pokémon Gem Pack Vol.5 CASE CN", "Pokémon Gem Pack Vol.5 Booster Box CN", "Terastal Gathering Booster Box CSV9.5C CN", "Pokemon Dragon Boat Festival 2026 Gift Box CN",
    "Pókemon Gem Pack Vol.3 Booster Box CN", "Pokémon Charizard Gift Box Case CN", "Pokémon Vaporeon Advanced Gift Box CN", "Pokemon 2026 Mid Autumn Gift Box CN", "Pokemon 151 Journey Jumbo Booster Box CN", "Pókemon Gem Pack Vol.4 Booster Box CN", "Pokémon 151 Gathering Coin Display CN", "Pokémon 151 Surprise Coin Display CN", "Pokémon Dream Painting Collection 151 Case CN", "Pokémon 30th Anniversary First Partner Vol. 1 CN", "Pokémon Gem Badge Display CN", "Charizard VSTAR Collection Gift Box CN", "Pokémon 151 Hope Coin Display CN", "Pokemon Mid Autumn Moon Festival Gift Box CN", "Pokémon TCG 25th Anniversary Collection Charizard Box CN", "Pokémon TCG 25th Anniversary Collection Venusaur Box CN", "Pokémon TCG 25th Anniversary Collection Blastoise Box CN", "Pokémon 151 Journey Slim Booster Box CN", "Pokémon TCG 25th Anniversary Collection Rayquaza Box CN", "Pokémon Dream Painting Aqua Figurine Case CN",
    "Pokemon Charizard VMAX Battle Set Gift Box CS0B CN", "Pokemon Chinese 1st Anniversary Gift Box CN", "Pokemon 151 First Partner Gift Box Bulbasaur CN", "Pokemon Travel Collection Tin Gift Box CN", "Pokemon Travel Collection Tin Gift Box DISPLAY CN", "Pokemon Glaceon GX Gift Box CN", "Pokemon Sylveon GX Gift Box CN", "Pokemon Umbreon GX Gift Box CN", "Pokemon Lillie's Support Gift Box CN", "Pokemon Leafeon GX Gift Box CN", "Pokemon Radiant Energy Pikachu Box CSK1 CN", "Pokemon Glory of Team Rocket Collector Blister T-CN", "Pokemon Radiant Energy Mew Box CSP1 CN", "Pokemon Terastal Gathering CSV9.5C Badge Set DISPLAY CN", "Pokemon Terastal Gathering Vaporeon Coin Display CN", "Pokemon Terastal Gathering Flareon Coin Display CN", "Pokemon Terastal Gathering Jolteon Coin Display CN", "Pokemon Terastal Gathering Umbreon Gift Box Set CN", "Pokemon Terastal Gathering Sylveon Gift Box Set CN", "Pokemon Terastal Gathering Jolteon Tin Box DISPLAY CN",
    "Pokemon Dark Crystal Blaze CSV5C Slim Booster Box CN", "Pokemon Chasing Glory Together Slim Booster Box CSV10C CN", "Pokemon Chasing Glory Together Briefcase CN", "Pokemon Super Ball + Poke Ball Bundle CN", "Pokemon Azure Shadow Slim Boxes Bundle CN", "Pokemon Storming Emergence Booster Box CSM1AC CN", "Pókemon Gem Pack Vol.1 Booster Box CN", "Pokemon 30th Celebration Premium Display Box CN", "Pokemon 30th Celebration Umbreon ex Deck Set CN", "Pokemon 30th Celebration Espeon ex Deck Set CN", "Pokemon 30th Celebration Coin Set DISPLAY CN", "Pokemon 30th Celebration Booster Box CN", "Pokemon Stellar Crystal Booster Box CSV9C CN", "Pokemon 30th Celebration Greninja EX Card CASE CN", "Pokemon 30th Celebration Sylveon EX Card Display Set CASE Chinese", "Pokemon True Mystery Slim Booster Box CSV6C CN", "Pokémon Gengar Gift Box Case CN", "Pokémon Eevee Gift Box Case CN", "Pokémon Flareon Advanced Gift Box CN", "Pokémon Jolteon Advanced Gift Box CN",
    "Mewtwo VSTAR Collection Gift Box CN", "Pokemon Arceus & Dialga & Palkia-GX Sealed Gift Box CN", "Pokémon TCG 25th Anniversary Collection Umbreon Box CN", "Pokemon Charizard VMAX Collection Set Gift Box CS0C CN", "Pokemon Terastal Gathering Eevee Coin Display CN", "Pokemon Terastal Gathering Quicksand Charm DISPLAY CN", "Pokemon Terastal Gathering Umbreon Coin Display CN", "Pokemon Terastal Gathering Umbreon Tin Box DISPLAY CN", "Pokemon Dark Crystal Blaze CSV5C Jumbo Booster Box CN"
  ],
  pkkr: [
    "Pokemon Terastal Festival Booster Box KR", "Pokémon White Flare Booster Box KR", "Pokémon Mega Inferno X Booster Box KR", "Pokemon Mega Brave Booster Box KR", "Pokemon Glory of Team Rocket Booster Box KR", "Pokémon 151 Booster Box KR", "Pokemon Heat Wave Arena Booster Box KR", "Pokémon Munikis Zero Booster Box KR", "Pokemon Crimson Haze Booster Box KR", "Pokemon Super Electric Breaker Booster Box KR", "Pokemon Stellar Crown Booster box KR", "Pokemon Night Wanderer Booster Box KR", "Pokemon Abyss Eye Booster Box KR", "Pokémon Mega Dream Ex Booster Box KR", "Pokemon Mega Symphonia Booster Box KR", "Pokémon Black Bolt Booster Box KR", "Pokemon Eevee Heroes Booster Box KR", "Pokemon Shiny Treasure ex Booster Box KR", "Pokemon Future Flash Booster Box KR", "Pokemon Cyber Judge Booster Box KR",
    "Pokemon Clay Burst Booster Box KR", "Pokemon Mask of Change Booster Box KR", "Pokemon Battle Partners Booster Box KR", "Pokemon Ruler of the Black Flame Booster Box KR", "Pokemon Blue Sky Stream KR", "Pokemon Ninja Spinner Booster Box KR", "Pokemon Paradise Dragona Booster Box KR", "Pokemon Wild Force Booster Box KR", "Pokemon Ancient Roar Booster Box KR", "Pokemon VSTAR Universe Booster Box KR", "Pokemon Snow Hazard Booster Box KR", "Pokemon Storm Emeralda Booster Box KR", "Pokemon Mega Festa 2026 Magikarp Promo Card 040/M-P Pack KR"
  ],
  opjp: [
    "One Piece PRB-02 The Best Vol.2 JP", "One Piece OP-14 The Seven Warlords of the Sea Booster Box JP", "One Piece Chopper Vol.1 Comic + Promo Card EB02-003", "One Piece TCG Luffy Ichiban Kuji Promo Card OP13-001 JP", "One Piece Base Shop Limited Playmat Vol.2 JP", "One Piece 4th Anniversary Holographic Sticker PACK OF 30", "One Piece Saikyo Jump Summit War Power Promo Pack JP", "One Piece PRB-01 The Best JP", "One Piece OP-13 Carrying on His Will JP", "One Piece OP-09 Emperors in the New World JP", "One Piece OP-11 A Fist of Divine Speed JP", "One Piece EB-03 Heroines Edition Booster Box JP", "One Piece EB-04 Egghead Crisis Booster Box JP", "One Piece EB-02 Anime 25th Collection JP", "One Piece OP-10 Royal Blood JP", "One Piece OP-08 Two Legends JP", "One Piece EB-01 Memorial Collection Booster Box JP", "One Piece OP-15 Adventure on Kami's Island Booster Box JP", "One Piece OP-12 Legacy of the Master JP", "One Piece OP-16 The Time of Battle JP",
    "One Piece Mini Tin Pack Set Vol. 3 TS-03 ASIA EXCLUSIVE Display JP", "[PRE-ORDER] One Piece Natsucomi Watermelon Luffy Metakira Card", "[PRE-ORDER] Luffy P-159 Shonen Jump Promo Regular Version", "One Piece Base Shop Limited Card Collection Vol.1 JP", "One Piece OP-17 The World's Strongest Warriors JP", "One Piece TCG x Round One Promo Pack JP"
  ],
  opcn: [
    "One Piece TCG Two Legends Slim Box OPC-08 CN", "One Piece TCG Legacy Of the Masters Slim Box OPC-12 CN", "One Piece OPC-13 Carrying on His Will Booster Box CN", "One Piece Romance Dawn OP01 Booster Box CN", "One Piece Paramount War OP02 Booster Box Chinese", "One Piece The Azure Seven Seas OPC14 Booster Box CN", "One Piece Adventure on Kami's Island OPC15 Booster Box CN", "One Piece EBC02 Anime 25th Collection Booster Box CN", "One Piece EBC03 Heroines Edition Booster Box CN", "One Piece OPC-16 The Time of Battle Booster Box CN", "One Piece Pillars of Strength OPC03 Booster Box CN", "One Piece OP-17 The World's Strongest Warriors CN"
  ],
  bgrade: [
    "[B-GRADE] Pokémon 151 Surprise Coin Display CN", "[B-GRADE] One Piece OP-14 The Seven Warlords of the Sea Booster Box JP", "[B-GRADE] Night Wanderer Booster Box JP", "[B-GRADE] Pokemon Snow Hazard Booster Box JP", "[B-GRADE] Cyber Judge Booster Box JP", "[B-GRADE] Future Flash Booster Box JP", "[B-GRADE] Pokemon Terastal Festival Booster Box KR", "[B-GRADE] Pokémon Mega Dream Ex Booster Box KR", "[B-GRADE] Pókemon Gem Pack Vol.3 Booster Box CN"
  ],
};

// Mappa i bucket grezzi del prototipo alle categorie usate nelle rotte del sito.
const CATEGORY_OF: Record<string, string> = {
  pkjp: "pokemon-jp",
  pkcn: "pokemon-cn",
  pkkr: "pokemon-kr",
  opjp: "one-piece-jp",
  opcn: "one-piece-cn",
  bgrade: "bgrade",
};

function typeOf(n: string): string {
  if (/\bCASE\b|\bCase\b/.test(n)) return "Case";
  if (/Bundle/i.test(n)) return "Bundle";
  if (/Slim (Booster )?Box|Slim Boxes/i.test(n)) return "Slim box";
  if (/Jumbo/i.test(n)) return "Jumbo box";
  if (/Booster Box|Booster box/.test(n)) return "Booster box";
  if (/Coin (Display|Set)|Badge/i.test(n)) return "Coin e badge";
  if (/\bTin\b/i.test(n)) return "Tin";
  if (/Deck/i.test(n)) return "Deck";
  if (/DISPLAY|Display/.test(n)) return "Display";
  if (/Special Box/i.test(n)) return "Special box";
  if (/Gift Box|Collection .*Box|Box CS|Blister|Briefcase|SINGLE BOX|Blind Box/i.test(n)) return "Gift box e collection";
  if (/Playmat|Sticker|Card Collection|Figurine|Plush/i.test(n)) return "Accessori";
  if (/Promo|Pack|Metakira|Version/i.test(n)) return "Promo e pack";
  return "Booster box";
}

const COST: Record<string, number> = {
  "Booster box": 72, "Slim box": 24, "Jumbo box": 58, Display: 62, "Coin e badge": 48, Tin: 46, Deck: 24,
  "Special box": 55, "Gift box e collection": 30, Case: 230, Bundle: 95, Accessori: 26, "Promo e pack": 16,
};

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Stima di costo finché non arriva un listino fornitore reale. Da NON mostrare come prezzo reale. */
function estCost(type: string, game: "pk" | "op", lang: "JP" | "CN" | "KR", name: string, bgrade: boolean): number {
  let c = COST[type] ?? 40;
  if (type === "Booster box") {
    c = game === "op" ? (lang === "JP" ? 82 : 46) : lang === "JP" ? 72 : lang === "KR" ? 44 : 40;
  }
  c *= 0.9 + (hash(name) % 26) / 100;
  if (bgrade) c *= 0.85;
  return Math.round(c * 100) / 100;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function codeOf(n: string): string | null {
  const m = n.match(/\b(OPC?-?\d{2}|EBC?-?\d{2}|PRB-\d{2}|TS-\d{2}|CSV[\d.]+C|CSM\w+|CS0[A-Z]|CSK1|CSP1|CSFM\d|OP\d{2}|OPC\d{2})\b/);
  return m ? m[1] : null;
}

function setNameOf(n: string): string {
  return n
    .replace(/\[.*?\]/g, "")
    .replace(/P[oóÓ]k[eé]mon|Pokemon|Pókemon/gi, "")
    .replace(/One Piece/gi, "")
    .replace(/\bTCG\b/g, "")
    .replace(/\b(JP|CN|KR|T-CN|Japanese|Chinese)\b/g, "")
    .replace(/Booster Box|Booster box|DISPLAY|Display|Gift Box Set|Gift Box|Slim Box(es)?|Jumbo Box(es)?|CASE|Case/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NEW_PER_CAT = 4;

async function main() {
  console.log("Seeding: impostazioni prezzo...");
  await prisma.pricingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log("Seeding: catalogo prodotti...");
  const seenSlugs = new Set<string>();
  let created = 0;

  for (const [rawCat, names] of Object.entries(RAW)) {
    const category = CATEGORY_OF[rawCat];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const game: "pk" | "op" = /one piece|luffy/i.test(name) || rawCat.startsWith("op") ? "op" : "pk";
      let lang: "JP" | "CN" | "KR" =
        ({ pkjp: "JP", opjp: "JP", pkcn: "CN", opcn: "CN", pkkr: "KR" } as Record<string, "JP" | "CN" | "KR">)[rawCat] ??
        (/\bKR\b/.test(name) ? "KR" : /\bCN\b|Chinese/.test(name) ? "CN" : "JP");

      const type = typeOf(name);
      const bgrade = /\[B-GRADE\]/i.test(name);
      const isPreorder = /\[PRE-ORDER\]/i.test(name);
      const setCode = codeOf(name);
      const setName = setNameOf(name) || name;
      const slug = slugify(name);

      if (seenSlugs.has(slug)) continue; // stesso dedup del prototipo
      seenSlugs.add(slug);

      const costEstimateEuro = estCost(type, game, lang, name, bgrade);

      await prisma.product.create({
        data: {
          supplierCode: setCode,
          name,
          slug,
          game: game === "op" ? Game.ONE_PIECE : Game.POKEMON,
          language: lang === "JP" ? Language.JP : lang === "CN" ? Language.CN : Language.KR,
          category,
          setName,
          setCode,
          type,
          condition: bgrade ? Condition.B_GRADE : Condition.NEW,
          supplierCostCents: Math.round(costEstimateEuro * 100),
          costVatTreatment: "NET_OF_VAT",
          costIsEstimated: true,
          vatRateBps: 2200,
          stockQty: null,
          published: true,
          isNew: rawCat !== "bgrade" && i < NEW_PER_CAT,
          isPreorder,
          matchStatus: "UNMATCHED",
        },
      });
      created++;
    }
  }
  console.log(`Creati ${created} prodotti.`);

  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: await hashPassword(adminPassword),
          name: "Admin",
          role: "ADMIN",
        },
      });
      console.log(`Account amministratore creato: ${adminEmail}`);
    } else {
      console.log(`Account amministratore già esistente: ${adminEmail}`);
    }
  } else {
    console.log("ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD non impostate: nessun admin creato dal seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
