import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { formatEuro, standardPriceCents } from "@/lib/pricing";
import { getPricingSettings, toPricingRules } from "@/lib/settings";
import { cleanProductName } from "@/lib/product-art";
import { BackButton } from "@/components/back-button";
import { AdminProductQuickActions } from "@/components/admin-product-quick-actions";

export const metadata = { title: "Admin · Prodotti" };

type View = "disponibili" | "esauriti" | "archiviati" | "eliminati";

const TABS: { key: View; label: string }[] = [
  { key: "disponibili", label: "Disponibili" },
  { key: "esauriti", label: "Esauriti" },
  { key: "archiviati", label: "Archiviati" },
  { key: "eliminati", label: "Eliminati" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; match?: string; estimated?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const view: View = (TABS.some((t) => t.key === sp.view) ? sp.view : "disponibili") as View;

  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.name = { contains: sp.q };
  if (sp.match) where.matchStatus = sp.match as "MATCHED" | "NEEDS_REVIEW" | "UNMATCHED" | "MANUAL";
  if (sp.estimated === "1") where.costIsEstimated = true;

  if (view === "eliminati") {
    where.deletedAt = { not: null };
  } else if (view === "archiviati") {
    where.deletedAt = null;
    where.archived = true;
  } else if (view === "esauriti") {
    where.deletedAt = null;
    where.archived = false;
    where.stockQty = 0;
  } else {
    where.deletedAt = null;
    where.archived = false;
    where.OR = [{ stockQty: null }, { stockQty: { gt: 0 } }];
  }

  const [products, settings, counts] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 }),
    getPricingSettings(),
    Promise.all([
      prisma.product.count({ where: { deletedAt: null, archived: false, OR: [{ stockQty: null }, { stockQty: { gt: 0 } }] } }),
      prisma.product.count({ where: { deletedAt: null, archived: false, stockQty: 0 } }),
      prisma.product.count({ where: { deletedAt: null, archived: true } }),
      prisma.product.count({ where: { deletedAt: { not: null } } }),
    ]),
  ]);
  const rules = toPricingRules(settings);
  const countByView: Record<View, number> = {
    disponibili: counts[0],
    esauriti: counts[1],
    archiviati: counts[2],
    eliminati: counts[3],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>Prodotti ({products.length})</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <form style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="view" value={view} />
            <input className="in" name="q" defaultValue={sp.q ?? ""} placeholder="Cerca per nome…" style={{ width: 260 }} />
            <button className="btn btn-dark btn-sm" type="submit">
              Cerca
            </button>
          </form>
          <Link href="/admin/prodotti/nuovo" className="btn btn-sm" style={{ background: "var(--gold)", color: "#000" }}>
            + Nuovo prodotto
          </Link>
        </div>
      </div>

      <div className="seg" style={{ background: "var(--soft)", alignSelf: "flex-start" }} role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/prodotti?view=${t.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
            role="tab"
            className={view === t.key ? "on" : ""}
          >
            {t.label} ({countByView[t.key]})
          </Link>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Categoria</th>
              <th>Costo</th>
              <th>Prezzo pubblico</th>
              <th>Stock</th>
              <th>Abbinamento</th>
              <th>Pubblicato</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{cleanProductName(p.name)}</td>
                <td>{p.category}</td>
                <td>
                  {p.supplierCostCents != null ? formatEuro(p.supplierCostCents) : "—"}
                  {p.costIsEstimated ? <span className="badge-status" style={{ marginLeft: 6 }}>stimato</span> : null}
                </td>
                <td>
                  {formatEuro(
                    standardPriceCents(
                      { costCents: p.supplierCostCents ?? 0, costVatTreatment: p.costVatTreatment, vatRateBps: p.vatRateBps },
                      rules
                    )
                  )}
                </td>
                <td>{p.stockQty ?? "n/d"}</td>
                <td>
                  <span className="badge-status">{p.matchStatus}</span>
                </td>
                <td>{p.published ? "Sì" : "No"}</td>
                <td>
                  <Link href={`/admin/prodotti/${p.id}`}>Modifica</Link>
                </td>
                <td>
                  <AdminProductQuickActions id={p.id} archived={p.archived} deleted={!!p.deletedAt} />
                </td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  Nessun prodotto in questa sezione.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
