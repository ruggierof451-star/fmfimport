/**
 * Calcolo del pubblico marketing e dei suoi segmenti, senza dipendenze esterne
 * (database e Resend stanno in marketing.ts): così la logica è testabile da sola.
 */

export const INTERESTS = [
  { key: "pokemon", label: "Pokémon", game: "POKEMON" },
  { key: "onepiece", label: "One Piece", game: "ONE_PIECE" },
  { key: "yugioh", label: "Yu-Gi-Oh!", game: "YUGIOH" },
  { key: "dragonball", label: "Dragon Ball", game: "DRAGON_BALL" },
] as const;
export type InterestKey = (typeof INTERESTS)[number]["key"];
export const INTEREST_KEYS = INTERESTS.map((i) => i.key) as InterestKey[];

export const SEGMENTS = [
  { key: "all", name: "FMF · Tutti gli iscritti", label: "Tutti gli iscritti" },
  { key: "clienti", name: "FMF · Clienti", label: "Clienti (hanno già comprato)" },
  { key: "rivenditori", name: "FMF · Rivenditori", label: "Rivenditori approvati" },
  ...INTERESTS.map((i) => ({ key: i.key, name: `FMF · Interesse ${i.label}`, label: `Interessati a ${i.label}` })),
] as const;
export type SegmentKey = (typeof SEGMENTS)[number]["key"];
export const SEGMENT_KEYS = SEGMENTS.map((s) => s.key) as SegmentKey[];

export function segmentLabel(key: string): string {
  return SEGMENTS.find((s) => s.key === key)?.label ?? key;
}

export interface AudienceMember {
  email: string;
  firstName: string | null;
  segments: Set<SegmentKey>;
}

export interface AudienceInput {
  /** utenti con marketingOptIn = true */
  users: { email: string; name: string | null; role: string }[];
  /** iscritti newsletter con status CONFIRMED */
  subscribers: { email: string; interests: string[] }[];
  /** ordini pagati (di chiunque: chi non ha consenso viene ignorato) */
  paidOrders: { email: string | null; games: string[] }[];
}

const GAME_TO_INTEREST: Record<string, InterestKey> = Object.fromEntries(INTERESTS.map((i) => [i.game, i.key]));

/**
 * Pubblico con consenso e relativi segmenti: tutti in "all"; rivenditori approvati in
 * "rivenditori"; chi ha almeno un ordine pagato in "clienti"; interessi dalle scelte
 * nel modulo newsletter e dai giochi dei prodotti acquistati.
 */
export function computeAudience(input: AudienceInput): Map<string, AudienceMember> {
  const audience = new Map<string, AudienceMember>();
  const add = (rawEmail: string, firstName: string | null) => {
    const email = rawEmail.toLowerCase().trim();
    let m = audience.get(email);
    if (!m) {
      m = { email, firstName, segments: new Set<SegmentKey>(["all"]) };
      audience.set(email, m);
    } else if (!m.firstName && firstName) {
      m.firstName = firstName;
    }
    return m;
  };

  for (const u of input.users) {
    const m = add(u.email, u.name?.trim().split(/\s+/)[0] || null);
    if (u.role === "RESELLER") m.segments.add("rivenditori");
  }
  for (const s of input.subscribers) {
    const m = add(s.email, null);
    for (const i of s.interests) if ((INTEREST_KEYS as string[]).includes(i)) m.segments.add(i as InterestKey);
  }
  for (const o of input.paidOrders) {
    const m = o.email ? audience.get(o.email.toLowerCase().trim()) : undefined;
    if (!m) continue;
    m.segments.add("clienti");
    for (const g of o.games) {
      const interest = GAME_TO_INTEREST[g];
      if (interest) m.segments.add(interest);
    }
  }
  return audience;
}

export function countSegments(audience: Map<string, AudienceMember>): Record<SegmentKey, number> {
  const counts = Object.fromEntries(SEGMENT_KEYS.map((k) => [k, 0])) as Record<SegmentKey, number>;
  for (const m of audience.values()) for (const s of m.segments) counts[s] += 1;
  return counts;
}
