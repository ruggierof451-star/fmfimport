import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { CatalogFilters, SortSelect, LoadMoreButton } from "@/components/catalog-filters";
import { listCatalog, type CatalogFilters as Filters } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { Game, Language } from "@/generated/prisma";

export interface CatalogSearchParams {
  game?: string | string[];
  lang?: string | string[];
  type?: string | string[];
  price?: string;
  sort?: string;
  page?: string;
  q?: string;
}

function toArray(v?: string | string[]): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export async function CatalogPage({ listKey, searchParams }: { listKey: string; searchParams: CatalogSearchParams }) {
  const filters: Filters = {
    games: toArray(searchParams.game),
    langs: toArray(searchParams.lang),
    types: toArray(searchParams.type),
    priceBand: (searchParams.price as Filters["priceBand"]) ?? "all",
    sort: (searchParams.sort as Filters["sort"]) ?? "rel",
    q: searchParams.q,
    page: Number(searchParams.page ?? "1") || 1,
  };

  const result = await listCatalog(listKey, filters);
  const { meta, usedFallback, total, shown, hasMore, availableTypes, manyGames, manyLangs, rules } = result;

  // Conteggi per i filtri — calcolati sul pool pre-filtro (coerente col prototipo: mostra quante
  // opzioni rimarrebbero disponibili, non quante sono già selezionate).
  const poolWhere = usedFallback ? meta.fallbackWhere ?? meta.where : meta.where;
  const pool = await prisma.product.findMany({ where: { AND: [{ published: true }, poolWhere ?? {}] } });
  const counts = {
    gamePk: pool.filter((p) => p.game === Game.POKEMON).length,
    gameOp: pool.filter((p) => p.game === Game.ONE_PIECE).length,
    langJp: pool.filter((p) => p.language === Language.JP).length,
    langCn: pool.filter((p) => p.language === Language.CN).length,
    langKr: pool.filter((p) => p.language === Language.KR).length,
    byType: Object.fromEntries(availableTypes.map((t) => [t, pool.filter((p) => p.type === t).length])),
  };

  const title = listKey === "cerca" ? `Risultati per "${filters.q}"` : meta.title;

  return (
    <>
      <Header activeKey={listKey} />
      <section className="lhead">
        <div className="wrap">
          <nav className="crumbs" aria-label="Percorso">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>{title}</span>
          </nav>
          <h1>{title}</h1>
          {meta.description ? <p>{meta.description}</p> : null}
          {meta.segment ? (
            <div className="seg" role="tablist">
              {meta.segment.map((s) => (
                <Link key={s.key} href={`/${s.key}`} role="tab" aria-selected={s.key === listKey} className={s.key === listKey ? "on" : ""}>
                  {s.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <main className="wrap lbody">
        {total === 0 && meta.emptyFallbackMessage ? <div className="alert info">{meta.emptyFallbackMessage}</div> : null}
        {total > 0 && usedFallback && meta.emptyFallbackMessage ? <div className="alert info">{meta.emptyFallbackMessage}</div> : null}
        <div className="tools">
          <div className="l">
            <span role="status" className="muted">
              {total} {total === 1 ? "prodotto" : "prodotti"}
            </span>
          </div>
          <SortSelect />
        </div>
        <div className="lay">
          <CatalogFilters availableTypes={availableTypes} manyGames={manyGames} manyLangs={manyLangs} counts={counts} />
          <div className="results">
            {shown.length ? (
              <>
                <div className="grid">
                  {shown.map(({ product }) => (
                    <ProductCard key={product.id} product={product} rules={rules} />
                  ))}
                </div>
                <div className="more">
                  <span className="muted">
                    Mostrati {shown.length} di {total}
                  </span>
                  {hasMore ? <LoadMoreButton currentPage={filters.page ?? 1} /> : null}
                </div>
              </>
            ) : (
              <div className="empty">
                <b>Nessun prodotto trovato</b>
                <p>
                  {listKey === "cerca"
                    ? "Prova con il codice del set (es. OP-14) o con un termine più generico."
                    : "Prova a togliere qualche filtro o a cambiare fascia di prezzo."}
                </p>
                <Link className="btn btn-dark btn-sm" href={listKey === "cerca" ? "/cerca" : `/${listKey}`}>
                  Azzera filtri
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
