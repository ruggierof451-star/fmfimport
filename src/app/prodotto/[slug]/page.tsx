import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductArt } from "@/components/product-art";
import { ProductCard } from "@/components/product-card";
import { ProductBuyBox } from "@/components/product-buybox";
import { getProductBySlug, getRelatedProducts, getTwinEditions, GAME_LABEL, LANG_LABEL } from "@/lib/catalog";
import { cleanProductName } from "@/lib/product-art";
import { standardPriceCents, bulkPriceCents, formatEuro } from "@/lib/pricing";
import { getPricingSettings, toPricingRules } from "@/lib/settings";
import { maxOrderableQty, stockLabel, stockTone } from "@/lib/stock";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = cleanProductName(product.name);
  return {
    title: name,
    description: `${name} — ${GAME_LABEL[product.game]} ${product.type} in edizione ${LANG_LABEL[product.language].toLowerCase()}. Spedizione da FMF Import.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.published) notFound();

  const settings = await getPricingSettings();
  const rules = toPricingRules(settings);
  const pricingInput = {
    costCents: product.supplierCostCents ?? 0,
    costVatTreatment: product.costVatTreatment,
    vatRateBps: product.vatRateBps,
  };
  const price = standardPriceCents(pricingInput, rules);
  const bulk = bulkPriceCents(pricingInput, rules);
  const cleanName = cleanProductName(product.name);
  const twins = await getTwinEditions(product);
  const related = await getRelatedProducts(product);
  const listKey = product.game === "ONE_PIECE" ? "onepiece" : "pokemon";
  const tone = stockTone(product.stockQty, product.isPreorder);
  const cap = maxOrderableQty(product.stockQty);

  return (
    <>
      <Header />
      <main className="wrap page" style={{ gap: 44, paddingTop: 20 }}>
        <nav className="crumbs" aria-label="Percorso" style={{ color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--gold-ink)" }}>
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${listKey}`} style={{ color: "var(--gold-ink)" }}>
            {GAME_LABEL[product.game]}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{cleanName}</span>
        </nav>
        <section className="pp" style={{ marginTop: -24 }}>
          <div className="gal">
            <div className="main">
              <ProductArt product={product} />
              <span className="lang" style={{ fontSize: 13 }}>
                {product.language}
              </span>
              <span className="note">Illustrazione · la foto reale arriverà dal catalogo</span>
            </div>
          </div>
          <div className="info">
            <div className="pills">
              <span className="pill dark">{GAME_LABEL[product.game]}</span>
              <span className="pill">{product.type}</span>
              <span className="pill">{LANG_LABEL[product.language]}</span>
              {product.condition === "B_GRADE" ? <span className="pill">B-Grade</span> : <span className="pill">Sigillato</span>}
              {product.isPreorder ? <span className="pill">Preordine</span> : null}
            </div>
            <h1>{cleanName}</h1>
            <div className="muted" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
              <span>
                Espansione: <b style={{ color: "var(--ink)" }}>{product.setName}</b>
              </span>
              {product.setCode ? (
                <span>
                  Codice set: <b className="mono" style={{ color: "var(--ink)" }}>{product.setCode}</b>
                </span>
              ) : null}
              <span>
                Lingua: <b style={{ color: "var(--ink)" }}>{LANG_LABEL[product.language]}</b>
              </span>
            </div>
            <div className="buybox">
              <ProductBuyBox
                productId={product.id}
                standardPriceCents={price}
                bulkPriceCents={bulk}
                bulkThresholdQty={rules.bulkThresholdQty}
                maxQty={cap}
                isPreorder={product.isPreorder}
              />
              {product.costIsEstimated ? (
                <div className="alert info" style={{ fontWeight: 500 }}>
                  Prezzo indicativo: verrà sostituito automaticamente dal listino del fornitore.
                </div>
              ) : null}
              {twins.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>
                    Disponibile anche in
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="btn btn-dark btn-sm" aria-current="true">
                      {LANG_LABEL[product.language]}
                      {product.condition === "B_GRADE" ? " · B-Grade" : ""}
                    </span>
                    {twins.map((t) => (
                      <Link key={t.id} className="btn btn-line btn-sm" href={`/prodotto/${t.slug}`}>
                        {LANG_LABEL[t.language]}
                        {t.condition === "B_GRADE" ? " · B-Grade" : ""}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className={`stock ${tone}`} style={{ fontSize: 14 }}>
                {stockLabel(product.stockQty, product.isPreorder)}
              </div>
            </div>
            <div className="assure">
              <div>
                <b>Spedizione</b>
                <span className="muted">
                  Gratis sopra {formatEuro(settings.freeShippingThresholdCents)} · tempi{" "}
                  <span className="ph">[DA CONFERMARE]</span>
                </span>
              </div>
              <div>
                <b>Originale</b>
                <span className="muted">Da distribuzione autorizzata</span>
              </div>
              <div>
                <b>Recesso 14 giorni</b>
                <span className="muted">
                  <Link href="/resi">Come funziona</Link>
                </span>
              </div>
            </div>
          </div>
        </section>
        <ProductTabs product={product} />
        {related.length ? (
          <section className="sec" aria-labelledby="rel">
            <div className="sechead">
              <h2 id="rel">Prodotti simili</h2>
            </div>
            <div className="grid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} rules={rules} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

function ProductTabs({ product }: { product: Awaited<ReturnType<typeof getProductBySlug>> }) {
  if (!product) return null;
  return (
    <section className="tabs" aria-label="Informazioni prodotto">
      <div className="tabpane" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Descrizione</h3>
          <p style={{ margin: "0 0 10px" }}>
            {product.type} {product.condition === "B_GRADE" ? "B-Grade (confezione esterna con difetti estetici, contenuto sigillato)" : "originale sigillato"} dell&apos;espansione <b>{product.setName}</b>, {GAME_LABEL[product.game]} in edizione {LANG_LABEL[product.language].toLowerCase()}.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Contenuto della confezione e descrizione completa verranno importati dalla scheda del fornitore.
          </p>
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Dettagli</h3>
          <dl className="spec">
            <dt>Gioco</dt>
            <dd>{GAME_LABEL[product.game]}</dd>
            <dt>Espansione</dt>
            <dd>{product.setName}</dd>
            {product.setCode ? (
              <>
                <dt>Codice set</dt>
                <dd className="mono">{product.setCode}</dd>
              </>
            ) : null}
            <dt>Lingua</dt>
            <dd>{LANG_LABEL[product.language]}</dd>
            <dt>Tipologia</dt>
            <dd>{product.type}</dd>
            <dt>Condizione</dt>
            <dd>{product.condition === "B_GRADE" ? "B-Grade" : "Nuovo, sigillato"}</dd>
            <dt>Nome fornitore</dt>
            <dd>{product.name}</dd>
          </dl>
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Spedizione e resi</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Spedizione tracciata; il numero di tracking arriva via email e nell&apos;area ordini.</li>
            <li>
              Diritto di recesso entro 14 giorni dalla consegna. <Link href="/resi">Leggi le condizioni</Link>.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
