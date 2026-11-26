import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";

export const metadata = { title: "Admin · Panoramica" };

export default async function AdminDashboard() {
  const [productCount, noPriceCount, pendingOrders, unreadMessages, pendingResellers, recentOrders] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, archived: false, published: true, priceCents: null } }),
    prisma.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "AVAILABILITY_CHECK", "TO_PROCURE"] } } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.resellerRequest.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Panoramica</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <StatCard label="Prodotti" value={String(productCount)} href="/admin/prodotti" />
        <StatCard label="Pubblicati senza prezzo" value={String(noPriceCount)} href="/admin/prodotti" warn={noPriceCount > 0} />
        <StatCard label="Ordini da evadere" value={String(pendingOrders)} href="/admin/ordini" warn={pendingOrders > 0} />
        <StatCard label="Messaggi da leggere" value={String(unreadMessages)} href="/admin/messaggi" warn={unreadMessages > 0} />
        <StatCard label="Richieste rivenditori" value={String(pendingResellers)} href="/admin/rivenditori" warn={pendingResellers > 0} />
      </div>

      <div className="admin-card">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Ultimi ordini</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Data</th>
              <th>Stato</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/ordini/${o.id}`}>{o.orderNumber}</Link>
                </td>
                <td>{o.createdAt.toLocaleDateString("it-IT")}</td>
                <td>
                  <span className="badge-status">{o.status}</span>
                </td>
                <td>{formatEuro(o.totalCents)}</td>
              </tr>
            ))}
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Nessun ordine ancora.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, warn }: { label: string; value: string; href: string; warn?: boolean }) {
  return (
    <Link href={href} className="admin-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="muted" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: warn ? "var(--warn)" : "var(--ink)" }}>{value}</div>
    </Link>
  );
}
