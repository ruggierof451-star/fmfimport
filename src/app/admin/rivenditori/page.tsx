import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminResellerRequestActions } from "@/components/admin-reseller-request-actions";

export const metadata = { title: "Admin · Rivenditori" };

export default async function AdminResellerRequestsPage() {
  const requests = await prisma.resellerRequest.findMany({ orderBy: { createdAt: "desc" } });
  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  // Stato reale dell'account collegato: approvare dà il ruolo Rivenditore, ma solo se
  // esiste già un account con quella email (altrimenti il cliente deve registrarsi).
  const accounts = await prisma.user.findMany({
    where: { email: { in: requests.map((r) => r.email.toLowerCase().trim()) } },
    select: { email: true, role: true },
  });
  const roleByEmail = new Map(accounts.map((a) => [a.email.toLowerCase(), a.role]));
  function accountState(email: string): { label: string; tone: "ok" | "warn" } {
    const role = roleByEmail.get(email.toLowerCase().trim());
    if (role === "RESELLER") return { label: "Account collegato · Rivenditore", tone: "ok" };
    if (role === "ADMIN") return { label: "Account admin", tone: "ok" };
    if (role) return { label: "Account registrato, ruolo non attivo", tone: "warn" };
    return { label: "Nessun account con questa email", tone: "warn" };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Richieste rivenditori</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
        Richieste arrivate dalla pagina pubblica &quot;Lavora con noi&quot;. Approvando, l&apos;account registrato
        con quella email diventa subito <b>Rivenditore</b> (compare in <Link href="/admin/utenti">Utenti</Link> e vede
        i prezzi dedicati). Se quella email non ha ancora un account te lo diciamo: il cliente si registra e poi lo
        colleghi da Utenti. I prezzi riservati si impostano sul singolo prodotto da{" "}
        <Link href="/admin/prodotti">Prodotti</Link> (prezzo rivenditore e scaglioni per quantità).
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
              <th>Account</th>
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
                <td>
                  {r.status === "APPROVED" ? (
                    <span className={accountState(r.email).tone === "ok" ? "ok" : "warn"} style={{ fontSize: 13 }}>
                      {accountState(r.email).label}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{r.note ?? "—"}</td>
                <td>{r.reviewedAt?.toLocaleDateString("it-IT") ?? "—"}</td>
                <td>{r.reviewedBy ?? "—"}</td>
              </tr>
            ))}
            {decided.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
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
