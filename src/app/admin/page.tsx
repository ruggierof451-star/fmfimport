import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";

export const metadata = { title: "Admin · Panoramica" };

export default async function AdminDashboard() {
  const [productCount, unmatchedCount, estimatedCount, pendingOrders, unreadMessages, recentOrders, lastSync] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { matchStatus: "UNMATCHED" } }),
    prisma.product.count({ where: { costIsEstimated: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "AVAILABILITY_CHECK", "TO_PROCURE"] } } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Panoramica</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <StatCard label="Prodotti pubblicati" value={String(productCount)} href="/admin/prodotti" />
        <StatCard label="Da abbinare al fornitore" value={String(unmatchedCount)} href="/admin/prodotti?match=UNMATCHED" warn={unmatchedCount > 0} />
        <StatCard label="Con costo stimato" value={String(estimatedCount)} href="/admin/prodotti?estimated=1" warn={estimatedCount > 0} />
        <StatCard label="Ordini da evadere" value={String(pendingOrders)} href="/admin/ordini" warn={pendingOrders > 0} />
        <StatCard label="Messaggi da leggere" value={String(unreadMessages)} href="/admin/messaggi" warn={unreadMessages > 0} />
      </div>

      <div className="admin-card">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Ultima sincronizzazione catalogo</h2>
        {lastSync ? (
          <p style={{ margin: 0 }}>
            {lastSync.startedAt.toLocaleString("it-IT")} · {lastSync.source} ·{" "}
            <span className="badge-status">{lastSync.status}</span> · {lastSync.createdCount} creati, {lastSync.updatedCount} aggiornati,{" "}
            {lastSync.errorCount} errori
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Nessuna sincronizzazione ancora eseguita. Il catalogo attuale viene dal seed iniziale con costi stimati.{" "}
            <Link href="/admin/import">Importa un listino</Link>.
          </p>
        )}
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
