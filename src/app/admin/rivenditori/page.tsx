import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminResellerRequestActions } from "@/components/admin-reseller-request-actions";

export const metadata = { title: "Admin · Rivenditori" };

export default async function AdminResellerRequestsPage() {
  const requests = await prisma.resellerRequest.findMany({ orderBy: { createdAt: "desc" } });
  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Richieste rivenditori</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
        Richieste arrivate dalla pagina pubblica &quot;Lavora con noi&quot;. Approvarle qui NON crea da sola un
        account né un listino scontato: dopo l&apos;approvazione, assegna manualmente il ruolo Rivenditore
        all&apos;account del cliente da <a href="/admin/utenti">Utenti</a> e imposta il prezzo rivenditore sui
        prodotti interessati da <a href="/admin/prodotti">Prodotti</a>.
      </p>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <h2 style={{ fontSize: 16, padding: "16px 16px 0" }}>Da valutare ({pending.length})</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Azienda</th>
              <th>P.IVA</th>
              <th>Referente</th>
              <th>Contatti</th>
              <th>Messaggio</th>
              <th>Richiesta del</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td>{r.companyName}</td>
                <td>{r.vatNumber}</td>
                <td>{r.contactName}</td>
                <td>
                  {r.email}
                  {r.phone ? <div className="muted">{r.phone}</div> : null}
                </td>
                <td style={{ maxWidth: 240 }}>{r.message ?? "—"}</td>
                <td>{r.createdAt.toLocaleDateString("it-IT")}</td>
                <td>
                  <AdminResellerRequestActions id={r.id} />
                </td>
              </tr>
            ))}
            {pending.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nessuna richiesta in attesa.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <h2 style={{ fontSize: 16, padding: "16px 16px 0" }}>Storico decisioni</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Azienda</th>
              <th>P.IVA</th>
              <th>Esito</th>
              <th>Nota</th>
              <th>Data</th>
              <th>Da</th>
            </tr>
          </thead>
          <tbody>
            {decided.map((r) => (
              <tr key={r.id}>
                <td>{r.companyName}</td>
                <td>{r.vatNumber}</td>
                <td>
                  <span className="badge-status">{r.status === "APPROVED" ? "Approvata" : "Rifiutata"}</span>
                </td>
                <td>{r.note ?? "—"}</td>
                <td>{r.reviewedAt?.toLocaleDateString("it-IT") ?? "—"}</td>
                <td>{r.reviewedBy ?? "—"}</td>
              </tr>
            ))}
            {decided.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Nessuna decisione ancora presa.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
