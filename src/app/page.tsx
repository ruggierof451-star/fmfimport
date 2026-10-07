import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import { getPricingSettings, toPricingRules } from "@/lib/settings";
import { formatEuro } from "@/lib/pricing";
import { LIST_META } from "@/lib/catalog";

const HOME_SECTIONS: { key: string; label: string }[] = [
  { key: "novita", label: "Novità" },
  { key: "pokemon-jp", label: "Pokémon JP" },
  { key: "pokemon-cn", label: "Pokémon CN" },
  { key: "pokemon-kr", label: "Pokémon KR" },
  { key: "one-piece-jp", label: "One Piece JP" },
  { key: "one-piece-cn", label: "One Piece CN" },
  { key: "bgrade", label: "B-Grade" },
];

const CATEGORY_TILES = [
  { key: "pokemon-jp", dark: true },
  { key: "pokemon-cn", dark: true },
  { key: "pokemon-kr", dark: true },
  { key: "one-piece-jp", dark: true },
  { key: "one-piece-cn", dark: true },
  { key: "bgrade", dark: false },
];

export default async function HomePage() {
  const settings = await getPricingSettings();
  const rules = toPricingRules(settings);
  const totalCount = await prisma.product.count({ where: { published: true } });

  const sections = await Promise.all(
    HOME_SECTIONS.map(async (s) => ({
      ...s,
      items: await prisma.product.findMany({ where: { AND: [{ published: true }, LIST_META[s.key].where] }, take: 5 }),
    }))
  );

  const tiles = await Promise.all(
    CATEGORY_TILES.map(async (t) => ({
      ...t,
      meta: LIST_META[t.key],
      count: await prisma.product.count({ where: { AND: [{ published: true }, LIST_META[t.key].where] } }),
    }))
  );

  return (
    <>
      <Header activeKey="home" />
      <section className="hero" aria-labelledby="h1">
        <div className="wrap">
          <div className="txt">
            <span className="eyebrow">Pokémon · One Piece · JP · CN · KR</span>
            <h1 id="h1">Prodotti sigillati dall&apos;Asia, prezzi chiari per tutti.</h1>
            <p>
              {totalCount} prodotti tra booster box, display e collection in edizione giapponese, cinese e coreana.
              Prezzi visibili senza registrazione; oltre {rules.bulkThresholdQty} pezzi il prezzo scende in automatico.
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
              <span>Fattura per P.IVA</span>
            </div>
          </div>
          <div className="art">
            <HeroArt />
          </div>
        </div>
      </section>

      <section className="perks" aria-label="Perché FMF Import">
        <div className="wrap">
          <Perk title="Originali e sigillati" desc="Da distribuzione autorizzata, mai riconfezionati." path="M12 19.5l5 5 10-11" />
          <Perk
            title="Prezzo quantità"
            desc={`Oltre ${rules.bulkThresholdQty} pezzi per articolo: ricarico ridotto in automatico.`}
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
        <section className="sec" aria-labelledby="cats">
          <div className="sechead">
            <h2 id="cats">Categorie</h2>
          </div>
          <div className="catgrid">
            {tiles.map((t) => (
              <Link key={t.key} className={`cat${t.dark ? " dark" : ""}`} href={`/${t.key}`}>
                <span className="c">{t.count} prodotti</span>
                <span>
                  <span className="n" style={{ display: "block" }}>
                    {t.meta.title}
                  </span>
                  <span className="d">{t.meta.description.split(".")[0]}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

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
                  <ProductCard key={p.id} product={p} rules={rules} />
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
              Negozi · live seller · vending
            </span>
            <h2 id="pro" style={{ fontSize: 25, fontWeight: 500 }}>
              Compri in quantità?
            </h2>
            <p style={{ margin: 0, color: "var(--on-night-muted)", maxWidth: 620, fontSize: 14 }}>
              Oltre {rules.bulkThresholdQty} pezzi dello stesso articolo il prezzo scende in automatico nel carrello.
              Fattura con P.IVA e codice SDI, condizioni dedicate per volumi continuativi.
            </p>
          </div>
          <Link className="btn" style={{ background: "#fff", color: "#000" }} href="/negozianti">
            Condizioni per negozianti
          </Link>
        </section>
      </main>
      <Footer />
    </>
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

function HeroArt() {
  return (
    <svg viewBox="0 0 480 340" aria-hidden="true">
      <rect width="480" height="340" fill="#FBFBFB" rx="12" />
      {[[60, 215, 165, 92], [255, 222, 150, 85], [145, 118, 190, 104]].map(([x, y, w, h], i) => (
        <g key={i}>
          <polygon points={`${x},${y} ${x + 36},${y - 22} ${x + w + 36},${y - 22} ${x + w},${y}`} fill="#F2F2F2" stroke="#D0D0D0" />
          <polygon
            points={`${x + w},${y} ${x + w + 36},${y - 22} ${x + w + 36},${y + h - 22} ${x + w},${y + h}`}
            fill="#EAEAEA"
            stroke="#D0D0D0"
          />
          <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke="#D0D0D0" />
          <rect x={x} y={y} width={w} height={13} fill="#222222" />
        </g>
      ))}
      <text x="240" y="182" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight={600} fontSize={28} fill="#333">
        OP-17
      </text>
      <text x="240" y="203" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize={9.5} letterSpacing={2.4} fill="#9A9A9A">
        BOOSTER BOX · JP
      </text>
      <text x="142" y="276" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight={600} fontSize={21} fill="#333">
        151
      </text>
      <text x="142" y="293" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize={8.5} letterSpacing={2.4} fill="#9A9A9A">
        CN
      </text>
      <text x="330" y="276" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight={600} fontSize={19} fill="#333">
        M2
      </text>
      <text x="330" y="293" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize={8.5} letterSpacing={2.4} fill="#9A9A9A">
        KR
      </text>
    </svg>
  );
}
