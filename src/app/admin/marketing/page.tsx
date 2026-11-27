import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";

export const metadata = { title: "Admin · Marketing" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  SENDING: "Invio in corso…",
  SENT: "Inviata",
  FAILED: "Invio fallito",
};

export default async function AdminMarketingPage() {
  const [campaigns, subscriberCount] = await Promise.all([
    prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { marketingOptIn: true } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Marketing</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
        Email di offerte e novità inviate solo a chi ha dato il consenso esplicito (checkbox in registrazione o
        nell&apos;account). Iscritti attuali: <b style={{ color: "var(--ink)" }}>{subscriberCount}</b>.
      </p>

      <Link href="/admin/marketing/nuovo" className="btn btn-dark" style={{ alignSelf: "flex-start" }}>
        Nuova campagna
      </Link>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Oggetto</th>
              <th>Stato</th>
              <th>Destinatari</th>
              <th>Creata</th>
              <th>Inviata</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.subject}</td>
                <td>
                  <span className="badge-status">{STATUS_LABEL[c.status] ?? c.status}</span>
                </td>
                <td>
                  {c.recipientCount != null ? c.recipientCount : "—"}
                  {c.failedCount ? ` (${c.failedCount} falliti)` : ""}
                </td>
                <td>{c.createdAt.toLocaleDateString("it-IT")}</td>
                <td>{c.sentAt ? c.sentAt.toLocaleDateString("it-IT") : "—"}</td>
                <td>
                  <Link className="btn btn-line btn-sm" href={`/admin/marketing/${c.id}`}>
                    {c.status === "DRAFT" ? "Modifica" : "Apri"}
                  </Link>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Nessuna campagna ancora creata.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
