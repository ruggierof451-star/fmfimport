import { prisma } from "@/lib/prisma";
import { Prisma, OrderStatus } from "@/generated/prisma";
import { formatEuro } from "@/lib/pricing";
import { BackButton } from "@/components/back-button";

export const metadata = { title: "Admin · Guadagni" };

// Ordini che contano come vendita reale: esclude annullati e rimborsati.
const SALE_STATUS_FILTER: Prisma.OrderWhereInput = {
  status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
};

function monthLabel(d: Date) {
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export default async function AdminEarningsPage() {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [allOrders, thisMonthOrders, lastMonthOrders, recentOrders, topItems] = await Promise.all([
    prisma.order.aggregate({ where: SALE_STATUS_FILTER, _sum: { totalCents: true }, _count: { _all: true } }),
    prisma.order.aggregate({
      where: { ...SALE_STATUS_FILTER, createdAt: { gte: startOfThisMonth } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { ...SALE_STATUS_FILTER, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { ...SALE_STATUS_FILTER, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, totalCents: true },
    }),
    prisma.orderItem.groupBy({
      by: ["nameSnapshot"],
      where: { order: SALE_STATUS_FILTER },
      _sum: { lineTotalCents: true, quantity: true },
      orderBy: { _sum: { lineTotalCents: "desc" } },
      take: 10,
    }),
  ]);

  // Raggruppa gli ordini degli ultimi 6 mesi per mese (fatto qui perché SQLite/Prisma
  // non espongono un group-by-mese pronto all'uso in modo portabile).
  const monthly = new Map<string, { label: string; totalCents: number; count: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthly.set(key, { label: monthLabel(d), totalCents: 0, count: 0 });
  }
  for (const o of recentOrders) {
    const key = `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`;
    const bucket = monthly.get(key);
    if (bucket) {
      bucket.totalCents += o.totalCents;
      bucket.count += 1;
    }
  }

  const totalRevenue = allOrders._sum.totalCents ?? 0;
  const totalCount = allOrders._count._all;
  const avgOrderCents = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
  const thisMonthRevenue = thisMonthOrders._sum.totalCents ?? 0;
  const lastMonthRevenue = lastMonthOrders._sum.totalCents ?? 0;
  const monthDeltaPct =
    lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Guadagni</h1>
      <p className="muted" style={{ margin: 0 }}>
        Basato sugli ordini non annullati né rimborsati. Importi sempre IVA inclusa.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>
            Totale vendite (storico)
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{formatEuro(totalRevenue)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {totalCount} ordini
          </div>
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>
            Questo mese
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{formatEuro(thisMonthRevenue)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {thisMonthOrders._count._all} ordini
            {monthDeltaPct !== null ? (
              <span style={{ color: monthDeltaPct >= 0 ? "#1a7a3a" : "#B33" }}>
                {" "}
                · {monthDeltaPct >= 0 ? "+" : ""}
                {monthDeltaPct}% vs mese scorso
              </span>
            ) : null}
          </div>
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>
            Mese scorso
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{formatEuro(lastMonthRevenue)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {lastMonthOrders._count._all} ordini
          </div>
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>
            Valore medio ordine
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{formatEuro(avgOrderCents)}</div>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <h2 style={{ fontSize: 16, padding: "16px 16px 0" }}>Ultimi 6 mesi</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Mese</th>
              <th>Ordini</th>
              <th>Fatturato</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(monthly.values()).map((m) => (
              <tr key={m.label}>
                <td style={{ textTransform: "capitalize" }}>{m.label}</td>
                <td>{m.count}</td>
                <td>{formatEuro(m.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <h2 style={{ fontSize: 16, padding: "16px 16px 0" }}>Prodotti più venduti (per fatturato)</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Pezzi venduti</th>
              <th>Fatturato</th>
            </tr>
          </thead>
          <tbody>
            {topItems.map((it) => (
              <tr key={it.nameSnapshot}>
                <td>{it.nameSnapshot}</td>
                <td>{it._sum.quantity ?? 0}</td>
                <td>{formatEuro(it._sum.lineTotalCents ?? 0)}</td>
              </tr>
            ))}
            {topItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  Nessuna vendita ancora.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
