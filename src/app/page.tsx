import { SectionFlag } from "@/components/flag";
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
                <h2 id={`s-${s.key}`}>
                  <SectionFlag sectionKey={s.key} size={20} />
                  {s.label}
                </h2>
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

/** Icone al tratto nere con dettagli oro (stile dei banner forniti). */
function PerkIconSvg({ icon }: { icon: PerkIcon }) {
  const k = { fill: "none", stroke: "#111", strokeWidth: 2.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const g = { ...k, stroke: "#C9A646" };
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {icon === "ball" ? (
        <>
          <path d="M6 20l20-8 20 8v20l-20 9-20-9z M6 20l20 8 20-8 M26 28v21 M14 16l20 8v7" {...k} />
          <path d="M47 31l11 4v8c0 7-5 11-11 13-6-2-11-6-11-13v-8z" {...g} fill="#fff" />
          <path d="M42 43l4 4 7-8" {...g} />
        </>
      ) : icon === "tag" ? (
        <>
          <path d="M34 8h18a4 4 0 0 1 4 4v18L30 56a4 4 0 0 1-6 0L8 40a4 4 0 0 1 0-6z" {...k} />
          <circle cx="47" cy="17" r="3" fill="#111" />
          <path d="M24 42l12-14" {...g} />
          <circle cx="25" cy="31" r="3" {...g} />
          <circle cx="35" cy="40" r="3" {...g} />
        </>
      ) : icon === "box" ? (
        <>
          <path d="M2 24h12M5 31h10M8 38h8" {...g} />
          <path d="M20 18h24v26H20z M44 28h9l7 8v8H44" {...k} />
          <circle cx="27" cy="47" r="4.5" {...k} fill="#fff" />
          <circle cx="51" cy="47" r="4.5" {...k} fill="#fff" />
        </>
      ) : (
        <>
          <path d="M52 26A21 21 0 0 0 14 18" {...k} />
          <path d="M14 8v10h10" {...k} />
          <path d="M12 38a21 21 0 0 0 38 8" {...k} />
          <path d="M50 56V46H40" {...k} />
          <path d="M24 32l6 6 11-12" {...g} strokeWidth={3.2} />
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
        <i className="perk-rule" aria-hidden="true" />
        <span>{desc}</span>
      </span>
      <PerkIconSvg icon={icon} />
    </div>
  );
}
