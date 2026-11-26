import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";

export const metadata = { title: "Admin · Etichette" };

export default async function AdminLabelsPage() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PAYMENT_CONFIRMED", "AVAILABILITY_CHECK", "TO_PROCURE", "PREPARING"] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Etichette di spedizione</h1>
      <div className="alert info">
        In attesa del collegamento diretto con BRT (Bartolini): per ora l&apos;etichetta è un foglio
        stampabile con mittente e destinatario, da compilare sul sito del corriere. Appena avremo le
        credenziali API, questa pagina genererà l&apos;etichetta BRT definitiva in automatico.
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Data</th>
              <th>Destinatario</th>
              <th>Città</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{o.createdAt.toLocaleDateString("it-IT")}</td>
                <td>{o.shipName}</td>
                <td>
                  {o.shipCity} ({o.shipProvince})
                </td>
                <td>
                  <span className="badge-status">{o.status}</span>
                </td>
                <td>
                  <Link href={`/admin/etichette/${o.id}`} className="btn btn-dark btn-sm">
                    Stampa etichetta
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Nessun ordine pronto per la spedizione.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
