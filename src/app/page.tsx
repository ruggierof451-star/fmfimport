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
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
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

  // Vetrina dell'hero: 3 foto reali, una per gioco/edizione diversa quando possibile, poi si
  // completa con le altre. Le foto caricate (Vercel Blob, già scontornate con Photoroom o al
  // caricamento) si usano così come sono; quelle nella cartella del sito vengono ritagliate.
  const HERO_PHOTO_COUNT = 3;
  const heroCandidates = await prisma.product.findMany({
    where: { published: true, imageUrl: { not: null } },
    take: 40,
    orderBy: [{ isNew: "desc" }, { updatedAt: "desc" }],
  });
  const heroResolved = (
    await Promise.all(
      heroCandidates.map(async (p) => {
        const url = p.imageUrl as string;
        if (/^https?:\/\//.test(url)) return { ...p, cutout: { url: displayImageUrl(url), width: 800, height: 800 } };
        const cutout = await ensureCutoutImage(url, p.slug);
        return cutout ? { ...p, cutout } : null;
      })
    )
  ).filter((p) => p !== null);
  const heroCutouts: typeof heroResolved = [];
  const seenCombos = new Set<string>();
  for (const p of heroResolved) {
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

  return (
    <div className="home-bg">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl("/"),
            email: "fmfcardssrls@gmail.com",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: absoluteUrl("/"),
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
            <span className="discount-banner">
              <b>-5% sul primo ordine</b> con il codice <b className="mono">FMFCARDS</b>
            </span>
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
          <Perk title="Originali e sigillati" desc="Da distribuzione autorizzata, mai riconfezionati." path="M12 19.5l5 5 10-11" />
          <Perk
            title="Prezzo unico e trasparente"
            desc="Stesso prezzo per tutti, visibile senza bisogno di registrarti."
            path="M11 27L27 11M13 13a2.5 2.5 0 1 0 0 0zM25 25a2.5 2.5 0 1 0 0 0z"
          />
          <Perk
            title="Spedizione gratuita"
            desc={`Sugli ordini sopra ${formatEuro(settings.freeShippingThresholdCents)}, con tracking.`}
            path="M8 13h14v12H8zM22 17h5l3 4v4h-8M13 26a2 2 0 1 0 0 0zM26 26a2 2 0 1 0 0 0z"
          />
          <Perk
            title="Disponibilità aggiornata"
            desc="Scorte e prezzi sincronizzati con il magazzino."
            path="M27 15a9 9 0 0 0-16-3M11 23a9 9 0 0 0 16 3M11 8v4h4M27 30v-4h-4"
          />
        </div>
      </section>

      <main className="wrap page">
        {sections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section className="sec" key={s.key} aria-labelledby={`s-${s.key}`}>
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

function Perk({ title, desc, path }: { title: string; desc: string; path: string }) {
  return (
    <div className="perk">
      <svg viewBox="0 0 34 34" aria-hidden="true">
        <rect x="0.5" y="0.5" width="33" height="33" rx="8" fill="#F4F4F4" />
        <g fill="none" stroke="#222222" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d={path} />
        </g>
      </svg>
      <span>
        <b>{title}</b>
        <span>{desc}</span>
      </span>
    </div>
  );
}
