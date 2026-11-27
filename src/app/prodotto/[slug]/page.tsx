import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductImage } from "@/components/product-image";
import { ProductCard } from "@/components/product-card";
import { ProductBuyBox, type PackagingOption } from "@/components/product-buybox";
import {
  getProductBySlug,
  getRelatedProducts,
  GAME_LABEL,
  LANG_LABEL,
  PACKAGING_LABEL,
  isJpBoosterBox,
} from "@/lib/catalog";
import { cleanProductName } from "@/lib/product-art";
import { unitPriceCentsFor, formatEuro } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";
import { isOutOfStock, maxOrderableQty } from "@/lib/stock";
import { getSession } from "@/lib/auth";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, breadcrumbJsonLd, DEFAULT_OG_IMAGE, NOINDEX, SITE_NAME } from "@/lib/site";
import { displayImageUrl } from "@/lib/blob-image";
import type { Metadata } from "next";

/** In vendita = visibile in catalogo e con un prezzo: solo questi vanno in Google. */
function isIndexable(p: { published: boolean; archived: boolean; deletedAt: Date | null; priceCents: number | null }) {
  return p.published && !p.archived && !p.deletedAt && p.priceCents != null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = cleanProductName(product.name);
  const description = `${name} — ${GAME_LABEL[product.game]} ${product.type} in edizione ${LANG_LABEL[product.language].toLowerCase()}. Spedizione da FMF Cards.`;
  const path = `/prodotto/${product.slug}`;
  return {
    title: name,
    description,
    alternates: { canonical: path },
    robots: isIndexable(product) ? undefined : NOINDEX,
    openGraph: {
      type: "website",
      url: path,
      title: `${name} · ${SITE_NAME}`,
      description,
      images: product.imageUrl ? [{ url: displayImageUrl(product.imageUrl), alt: name }] : [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.published) notFound();

  const settings = await getPricingSettings();
  const session = await getSession();
  const isReseller = session?.role === "RESELLER";
  const resellerTiers = isReseller ? product.resellerTiers.map((t) => ({ minQty: t.minQty, priceCents: t.priceCents })) : [];
  const isResellerPrice = isReseller && (product.resellerPriceCents != null || resellerTiers.length > 0);
  const cleanName = cleanProductName(product.name);
  const related = await getRelatedProducts(product);

  const canChoosePackaging = isJpBoosterBox(product.category, product.type);
  const packagingOptions: PackagingOption[] = [
    { value: "SEALED", label: PACKAGING_LABEL.SEALED, priceCents: unitPriceCentsFor(product, isReseller, "SEALED") },
    ...(canChoosePackaging && product.noWrapPriceCents != null
      ? [{ value: "NO_WRAP" as const, label: PACKAGING_LABEL.NO_WRAP, priceCents: unitPriceCentsFor(product, isReseller, "NO_WRAP") }]
      : []),
    ...(canChoosePackaging && product.damagedPriceCents != null
      ? [{ value: "DAMAGED" as const, label: PACKAGING_LABEL.DAMAGED, priceCents: unitPriceCentsFor(product, isReseller, "DAMAGED") }]
      : []),
  ];
  const listKey = product.game === "ONE_PIECE" ? "onepiece" : "pokemon";
  const soldOut = isOutOfStock(product.stockQty);
  const cap = maxOrderableQty(product.stockQty);

  // Dati strutturati Product: prezzo pubblico IVA inclusa del prodotto principale
  // (mai il prezzo rivenditore) e disponibilità reale.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cleanName,
    sku: product.supplierCode ?? product.slug,
    category: `${GAME_LABEL[product.game]} · ${product.type}`,
    brand: { "@type": "Brand", name: GAME_LABEL[product.game] },
    description: `${cleanName} — ${GAME_LABEL[product.game]} ${product.type} in edizione ${LANG_LABEL[product.language].toLowerCase()}.`,
    image: product.imageUrl
      ? [(() => {
          const u = displayImageUrl(product.imageUrl);
          return u.startsWith("http") ? u : absoluteUrl(u);
        })()]
      : undefined,
    url: absoluteUrl(`/prodotto/${product.slug}`),
    offers:
      product.priceCents != null
        ? {
            "@type": "Offer",
            url: absoluteUrl(`/prodotto/${product.slug}`),
            priceCurrency: "EUR",
            price: (product.priceCents / 100).toFixed(2),
            itemCondition: "https://schema.org/NewCondition",
            availability: product.isPreorder
              ? "https://schema.org/PreOrder"
              : soldOut && !product.variants.length
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
            seller: { "@type": "Organization", name: SITE_NAME },
          }
        : undefined,
  };

  return (
    <>
      {isIndexable(product) ? (
        <JsonLd
          data={[
            productJsonLd,
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: GAME_LABEL[product.game], path: `/${listKey}` },
              { name: cleanName, path: `/prodotto/${product.slug}` },
            ]),
          ]}
        />
      ) : null}
      <Header />
      <main className="wrap page" style={{ gap: 44, paddingTop: 20 }}>
        <nav className="crumbs pp-crumbs" aria-label="Percorso" style={{ color: "var(--muted)" }}>
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
              {product.isPreorder ? <span className="pill">Preordine</span> : null}
              {soldOut ? <span className="pill">{product.variants.length ? `${product.type} esaurito` : "Esaurito"}</span> : null}
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
                packagingOptions={packagingOptions}
                mainLabel={product.type}
                variants={product.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents }))}
                maxQty={cap}
                isPreorder={product.isPreorder}
                isResellerPrice={isResellerPrice}
                resellerTiers={resellerTiers}
              />
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
              Diritto di recesso entro 14 giorni per gli acquisti da privato; prodotti danneggiati o mancanti da segnalare entro 7 giorni.{" "}
              <Link href="/resi">Leggi le condizioni</Link>.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
