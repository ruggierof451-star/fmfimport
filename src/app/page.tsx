import { Fragment } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getPricingSettings } from "@/lib/settings";
import { formatEuro } from "@/lib/pricing";
import { LIST_META } from "@/lib/catalog";
import { cleanProductName } from "@/lib/product-art";
import { ensureCutoutImage } from "@/lib/image-cutout";
import { displayImageUrl } from "@/lib/blob-image";
import { getSession } from "@/lib/auth";
import { JsonLd } from "@/components/json-ld";
import { HeroCarousel } from "@/components/hero-carousel";
import { absoluteUrl, DEFAULT_OG_IMAGE, organizationJsonLd, SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", images: [DEFAULT_OG_IMAGE] },
};

const HOME_SECTIONS: { key: string; label: string }[] = [
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

export default async function HomePage() {
  const settings = await getPricingSettings();
  const session = await getSession();
  const isReseller = session?.role === "RESELLER";

  const sections = await Promise.all(
    HOME_SECTIONS.map(async (s) => ({
      ...s,
      items: await prisma.product.findMany({ where: { AND: [{ published: true }, LIST_META[s.key].where] }, take: 5 }),
    }))
  );

  // Vetrina dell'hero: prima i prodotti scelti dall'admin ("Vetrina in home", massimo 3); se
  // sono meno di 3 si completa da soli con foto reali, una per gioco/edizione diversa quando
  // possibile, poi con le altre. Le foto caricate (Vercel Blob, già scontornate con Photoroom o al
  // caricamento) si usano così come sono; quelle nella cartella del sito vengono ritagliate.
  const HERO_PHOTO_COUNT = 3;
  const heroCandidates = await prisma.product.findMany({
    where: { published: true, archived: false, deletedAt: null, condition: "NEW", imageUrl: { not: null } },
    take: 40,
    orderBy: [{ heroFeatured: "desc" }, { isNew: "desc" }, { updatedAt: "desc" }],
  });
  const heroResolved = (
    await Promise.all(
      heroCandidates.map(async (p) => {
        const url = p.imageUrl as string;
        // foto caricate (archivio Blob o database /immagini/…): già scontornate, si usano così
        if (/^https?:\/\//.test(url) || url.startsWith("/immagini/")) {
          return { ...p, cutout: { url: displayImageUrl(url), width: 800, height: 800 } };
        }
        const cutout = await ensureCutoutImage(url, p.slug);
        return cutout ? { ...p, cutout } : null;
      })
    )
  ).filter((p) => p !== null);
  const heroCutouts: typeof heroResolved = heroResolved.filter((p) => p.heroFeatured).slice(0, HERO_PHOTO_COUNT);
  const seenCombos = new Set<string>(heroCutouts.map((p) => `${p.game}-${p.language}`));
  for (const p of heroResolved) {
    if (heroCutouts.length === HERO_PHOTO_COUNT) break;
    if (heroCutouts.includes(p)) continue;
    const combo = `${p.game}-${p.language}`;
    if (seenCombos.has(combo)) continue;
    seenCombos.add(combo);
    heroCutouts.push(p);
    if (heroCutouts.length === HERO_PHOTO_COUNT) break;
  }
  for (const p of heroResolved) {
    if (heroCutouts.length === HERO_PHOTO_COUNT) break;
    if (!heroCutouts.includes(p)) heroCutouts.push(p);
  }

  const perks = [
    { title: "Originali e sigillati", desc: "Da distribuzione autorizzata, mai riconfezionati.", icon: "ball" as const },
    { title: "Prezzo unico e trasparente", desc: "Stesso prezzo per tutti, visibile senza bisogno di registrarti.", icon: "tag" as const },
    { title: "Spedizione gratuita", desc: `Sugli ordini sopra ${formatEuro(settings.freeShippingThresholdCents)}, con tracking.`, icon: "box" as const },
    { title: "Disponibilità aggiornata", desc: "Scorte e prezzi sincronizzati con il magazzino.", icon: "sync" as const },
  ];
  return (
    <div className="home-bg">
      <JsonLd
        data={[
          organizationJsonLd(),
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            alternateName: ["FMF", "FMFCards", "fmfcards.com"],
            url: absoluteUrl("/"),
            publisher: { "@id": `${absoluteUrl("/")}#organizzazione` },
            inLanguage: "it-IT",
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/cerca")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <Header activeKey="home" transparent />
      <section className="hero" aria-labelledby="h1">
        <div className="wrap">
          <div className="txt">
            <span className="eyebrow">Pokémon · One Piece · Yu-Gi-Oh! · Dragon Ball</span>
            <h1 id="h1">Ogni collezione ha una storia. La tua inizia qui.</h1>
            <p>
              Booster box, display e collection in edizione italiana e di importazione (giapponese, cinese,
              coreana). Prezzi chiari e uguali per tutti, visibili senza registrazione.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link className="btn btn-gold" href="/pokemon">
                Catalogo Pokémon
              </Link>
              <Link className="btn btn-line" href="/onepiece">
                Catalogo One Piece
              </Link>
            </div>
            <div className="facts">
              <span>Spedizione gratuita sopra {formatEuro(settings.freeShippingThresholdCents)}</span>
              <span>Acquisto anche senza account</span>
              <span>Pagamento sicuro con carta o bonifico</span>
            </div>
          </div>
          <div className="art">
            <div className="promo-mobile">
              <span className="promo-pct">-5%</span>
              <span className="promo-txt">
                sul primo ordine
                <small>
                  con il codice <b>WELCOME5</b>
                </small>
              </span>
            </div>
            {heroCutouts.length >= 3 ? (
              <HeroCarousel
                slides={heroCutouts.map((p) => ({
                  slug: p.slug,
                  name: cleanProductName(p.name),
                  url: p.cutout.url,
                  width: p.cutout.width,
                  height: p.cutout.height,
                }))}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="perks" aria-label="Perché FMF Cards">
        <div className="wrap">
          {perks.map((p) => (
            <Perk key={p.title} {...p} />
          ))}
        </div>
      </section>

      <main className="wrap page">
        {sections
          .filter((s) => s.items.length > 0)
          .map((s, i) => (
            <Fragment key={s.key}>
            <section className="sec" aria-labelledby={`s-${s.key}`}>
              <div className="sechead">
                <h2 id={`s-${s.key}`}>{s.label}</h2>
                <Link href={`/${s.key}`}>Vedi tutti</Link>
              </div>
              <div className="grid row5">
                {s.items.map((p) => (
                  <ProductCard key={p.id} product={p} isReseller={isReseller} />
                ))}
              </div>
            </section>
            {i === 0 ? (
              <div className="perks-mobile" aria-label="Perché FMF Cards">
                {perks.map((pk) => (
                  <Perk key={pk.title} className="perk-banner" {...pk} />
                ))}
              </div>
            ) : null}
            </Fragment>
          ))}

        <section
          className="sec"
          style={{
            background: "#000",
            color: "#fff",
            borderRadius: 12,
            padding: "clamp(22px,3.4vw,40px)",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px 40px",
          }}
          aria-labelledby="pro"
        >
          <div style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="eyebrow" style={{ color: "var(--on-night-muted)" }}>
              Negozi · rivenditori · distribuzione
            </span>
            <h2 id="pro" style={{ fontSize: 25, fontWeight: 500 }}>
              Sei un negozio o un rivenditore?
            </h2>
            <p style={{ margin: 0, color: "var(--on-night-muted)", maxWidth: 620, fontSize: 14 }}>
              Registrati con la tua partita IVA: valutiamo la richiesta e, se approvata, ti garantiamo un listino
              dedicato da distributore.
            </p>
          </div>
          <Link className="btn" style={{ background: "#fff", color: "#000" }} href="/lavora-con-noi">
            Lavora con noi
          </Link>
        </section>
      </main>
      <Footer transparent />
    </div>
  );
}

type PerkIcon = "ball" | "tag" | "box" | "sync";

/** Icone a colori dei punti di forza (contorno nero spesso, stile adesivo). */
function PerkIconSvg({ icon }: { icon: PerkIcon }) {
  const k = { stroke: "#111", strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {icon === "ball" ? (
        <>
          <circle cx="32" cy="32" r="27" fill="#fff" {...k} />
          <path d="M5 32a27 27 0 0 1 54 0z" fill="#E3262E" {...k} />
          <path d="M14 20a20 20 0 0 1 10-7" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          <line x1="5" y1="32" x2="59" y2="32" {...k} />
          <circle cx="32" cy="32" r="8" fill="#fff" {...k} />
          <circle cx="32" cy="32" r="3.5" fill="#fff" {...k} strokeWidth={2.5} />
        </>
      ) : icon === "tag" ? (
        <g transform="rotate(-35 32 32)">
          <path d="M8 22h34l14 10-14 10H8a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4z" fill="#F6CF3C" {...k} />
          <circle cx="45" cy="32" r="3" fill="#fff" {...k} strokeWidth={2.5} />
          <line x1="16" y1="38" x2="28" y2="26" {...k} />
          <circle cx="17" cy="27.5" r="2.5" fill="#111" />
          <circle cx="27" cy="36.5" r="2.5" fill="#111" />
        </g>
      ) : icon === "box" ? (
        <>
          <path d="M8 22l24-10 24 10v24L32 56 8 46z" fill="#D9A15C" {...k} />
          <path d="M8 22l24 10 24-10M32 32v24" fill="none" {...k} />
          <path d="M8 22l24 10v24L8 46z" fill="#C88B45" {...k} />
          <path d="M18 18l24 10v8l-6-2v-8L12 20" fill="#B7793A" {...k} strokeWidth={2.5} />
        </>
      ) : (
        <>
          <path d="M50 26A19 19 0 0 0 16 20l-4-4v14h14l-5-5a12 12 0 0 1 21 3z" fill="#6CC24A" {...k} />
          <path d="M14 38a19 19 0 0 0 34 6l4 4V34H38l5 5a12 12 0 0 1-21-3z" fill="#6CC24A" {...k} />
        </>
      )}
    </svg>
  );
}

function Perk({ title, desc, icon, className = "perk" }: { title: string; desc: string; icon: PerkIcon; className?: string }) {
  return (
    <div className={className}>
      <span>
        <b>{title}</b>
        <span>{desc}</span>
      </span>
      <PerkIconSvg icon={icon} />
    </div>
  );
}
