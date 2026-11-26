import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductImage } from "@/components/product-image";
import { ProductCard } from "@/components/product-card";
import { ProductBuyBox } from "@/components/product-buybox";
import { getProductBySlug, getRelatedProducts, getTwinEditions, GAME_LABEL, LANG_LABEL, PACKAGING_LABEL } from "@/lib/catalog";
import { cleanProductName } from "@/lib/product-art";
import { unitPriceCentsFor, formatEuro } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";
import { isOutOfStock, maxOrderableQty } from "@/lib/stock";
import { getSession } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = cleanProductName(product.name);
  return {
    title: name,
    description: `${name} — ${GAME_LABEL[product.game]} ${product.type} in edizione ${LANG_LABEL[product.language].toLowerCase()}. Spedizione da FMF Cards.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.published) notFound();

  const settings = await getPricingSettings();
  const session = await getSession();
  const isReseller = session?.role === "RESELLER";
  const price = unitPriceCentsFor(product, isReseller);
  const isResellerPrice = isReseller && product.resellerPriceCents != null;
  const cleanName = cleanProductName(product.name);
  const twins = await getTwinEditions(product);
  const related = await getRelatedProducts(product);
  const listKey = product.game === "ONE_PIECE" ? "onepiece" : "pokemon";
  const soldOut = isOutOfStock(product.stockQty);
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
              <ProductImage product={product} alt={cleanName} sizes="(max-width: 760px) 92vw, 460px" priority />
              <span className="lang" style={{ fontSize: 13 }}>
                {product.language}
              </span>
              {!product.imageUrl ? <span className="note">Illustrazione · la foto reale arriverà dal catalogo</span> : null}
            </div>
          </div>
          <div className="info">
            <div className="pills">
              <span className="pill dark">{GAME_LABEL[product.game]}</span>
              <span className="pill">{product.type}</span>
              <span className="pill">{LANG_LABEL[product.language]}</span>
              {product.condition === "B_GRADE" ? <span className="pill">B-Grade</span> : <span className="pill">Sigillato</span>}
              {product.packaging !== "SEALED" ? <span className="pill">{PACKAGING_LABEL[product.packaging]}</span> : null}
              {product.isPreorder ? <span className="pill">Preordine</span> : null}
              {soldOut ? <span className="pill">Esaurito</span> : null}
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
                priceCents={price}
                maxQty={cap}
                isPreorder={product.isPreorder}
                isResellerPrice={isResellerPrice}
              />
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
            </div>
            <div className="assure">
              <div>
                <b>Spedizione</b>
                <span className="muted">
                  Gratis sopra {formatEuro(settings.freeShippingThresholdCents)} · 1-3 giorni lavorativi
                </span>
              </div>
              <div>
                <b>Originale</b>
                <span className="muted">Da distribuzione autorizzata</span>
              </div>
              <div>
                <b>Reso 14 giorni</b>
                <span className="muted">
                  Diritto di recesso · <Link href="/resi">Come funziona</Link>
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
                <ProductCard key={p.id} product={p} isReseller={isReseller} />
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
          {product.description ? (
            <div className="prose" dangerouslySetInnerHTML={{ __html: product.description }} />
          ) : (
            <>
              <p style={{ margin: "0 0 10px" }}>
                {product.type} {product.condition === "B_GRADE" ? "B-Grade (confezione esterna con difetti estetici, contenuto sigillato)" : "originale sigillato"} dell&apos;espansione <b>{product.setName}</b>, {GAME_LABEL[product.game]} in edizione {LANG_LABEL[product.language].toLowerCase()}.
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Descrizione completa in arrivo a breve.
              </p>
            </>
          )}
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
          </dl>
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Spedizione e resi</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Spedizione tracciata; il numero di tracking arriva via email e nell&apos;area ordini.</li>
            <li>
              Reso entro 7 giorni dalla consegna solo per prodotti danneggiati o mancanti. <Link href="/resi">Leggi le condizioni</Link>.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
