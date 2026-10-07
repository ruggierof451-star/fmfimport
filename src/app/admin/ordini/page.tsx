import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { formatEuro } from "@/lib/pricing";

export const metadata = { title: "Admin · Ordini" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.OrderWhereInput = {};
  if (sp.status) where.status = sp.status as Prisma.EnumOrderStatusFilter["equals"];
  if (sp.q) where.OR = [{ orderNumber: { contains: sp.q } }, { guestEmail: { contains: sp.q } }, { shipName: { contains: sp.q } }];

  const orders = await prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });

  const statuses = [
    "PENDING_PAYMENT",
    "PAYMENT_CONFIRMED",
    "AVAILABILITY_CHECK",
    "TO_PROCURE",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Ordini ({orders.length})</h1>
      <form style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="in" name="q" defaultValue={sp.q ?? ""} placeholder="Numero, email o nome…" style={{ width: 260 }} />
        <select className="in" name="status" defaultValue={sp.status ?? ""} style={{ width: 220 }}>
          <option value="">Tutti gli stati</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn btn-dark btn-sm" type="submit">
          Filtra
        </button>
      </form>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Stato</th>
              <th>Pagamento</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/ordini/${o.id}`}>{o.orderNumber}</Link>
                </td>
                <td>
                  {o.shipName}
                  <br />
                  <span className="muted">{o.guestEmail}</span>
                </td>
                <td>{o.createdAt.toLocaleDateString("it-IT")}</td>
                <td>
                  <span className="badge-status">{o.status}</span>
                </td>
                <td>{o.paymentStatus}</td>
                <td>{formatEuro(o.totalCents)}</td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Nessun ordine trovato.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
