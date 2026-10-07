import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";
import { AdminOrderStatusForm } from "@/components/admin-order-status-form";

export const metadata = { title: "Admin · Dettaglio ordine" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, statusHistory: { orderBy: { changedAt: "desc" } }, user: true },
  });
  if (!order) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>
        Ordine <span className="mono">{order.orderNumber}</span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="admin-card">
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Cliente</h2>
          <p style={{ margin: 0 }}>
            {order.shipName}
            <br />
            {order.guestEmail ?? order.user?.email}
            <br />
            {order.shipPhone}
          </p>
          <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Spedizione</h3>
          <p style={{ margin: 0 }}>
            {order.shipStreet}
            <br />
            {order.shipPostal} {order.shipCity} ({order.shipProvince}) — {order.shipCountry}
          </p>
          {order.invoiceRequested ? (
            <>
              <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Fatturazione</h3>
              <p style={{ margin: 0 }}>
                {order.companyName}
                <br />
                P.IVA {order.vatNumber} · SDI {order.sdiCode || "—"}
              </p>
            </>
          ) : null}
          {order.customerNote ? (
            <>
              <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Nota cliente</h3>
              <p style={{ margin: 0 }}>{order.customerNote}</p>
            </>
          ) : null}
        </div>

        <div className="admin-card">
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Totali</h2>
          <div className="sum" style={{ background: "transparent", padding: 0 }}>
            <div className="r">
              <span>Subtotale</span>
              <span>{formatEuro(order.subtotalCents)}</span>
            </div>
            {order.discountCents > 0 ? (
              <div className="r ok">
                <span>Sconto quantità</span>
                <span>−{formatEuro(order.discountCents)}</span>
              </div>
            ) : null}
            <div className="r">
              <span>Spedizione</span>
              <span>{order.shippingCents ? formatEuro(order.shippingCents) : "Gratis"}</span>
            </div>
            {order.invoiceVatCents > 0 ? (
              <div className="r">
                <span>IVA fattura (richiesta dal cliente)</span>
                <span>{formatEuro(order.invoiceVatCents)}</span>
              </div>
            ) : null}
            <div className="r t">
              <span>Totale</span>
              <span>{formatEuro(order.totalCents)}</span>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Pagamento: {order.paymentMethod} · {order.paymentStatus}
          </p>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Prezzi del sito sempre IVA esclusa; la riga IVA fattura compare solo se il cliente ha richiesto la
            fattura con partita IVA.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Articoli</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Quantità</th>
              <th>Prezzo unitario</th>
              <th>Costo unitario (interno)</th>
              <th>Totale riga</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.nameSnapshot}</td>
                <td>{item.quantity}</td>
                <td>{formatEuro(item.unitPriceCentsSnapshot)}</td>
                <td className="muted">{item.supplierCostCentsSnapshot != null ? formatEuro(item.supplierCostCentsSnapshot) : "—"}</td>
                <td>{formatEuro(item.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminOrderStatusForm orderId={order.id} currentStatus={order.status} trackingCarrier={order.trackingCarrier} trackingNumber={order.trackingNumber} />

      <div className="admin-card">
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Cronologia stati</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Data</th>
              <th>Stato</th>
              <th>Nota</th>
              <th>Operatore</th>
            </tr>
          </thead>
          <tbody>
            {order.statusHistory.map((h) => (
              <tr key={h.id}>
                <td>{h.changedAt.toLocaleString("it-IT")}</td>
                <td>
                  <span className="badge-status">{h.status}</span>
                </td>
                <td>{h.note ?? "—"}</td>
                <td>{h.changedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
