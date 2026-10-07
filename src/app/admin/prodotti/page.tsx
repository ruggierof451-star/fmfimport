import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { formatEuro, standardPriceCents } from "@/lib/pricing";
import { getPricingSettings, toPricingRules } from "@/lib/settings";
import { cleanProductName } from "@/lib/product-art";

export const metadata = { title: "Admin · Prodotti" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; match?: string; estimated?: string; published?: string }>;
}) {
  const sp = await searchParams;
  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.name = { contains: sp.q };
  if (sp.match) where.matchStatus = sp.match as "MATCHED" | "NEEDS_REVIEW" | "UNMATCHED" | "MANUAL";
  if (sp.estimated === "1") where.costIsEstimated = true;
  if (sp.published === "0") where.published = false;

  const [products, settings] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 }),
    getPricingSettings(),
  ]);
  const rules = toPricingRules(settings);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>Prodotti ({products.length})</h1>
        <form style={{ display: "flex", gap: 8 }}>
          <input className="in" name="q" defaultValue={sp.q ?? ""} placeholder="Cerca per nome…" style={{ width: 260 }} />
          <button className="btn btn-dark btn-sm" type="submit">
            Cerca
          </button>
        </form>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
