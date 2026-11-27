import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminMarketingQueueButton } from "@/components/admin-marketing-queue-button";
import { SEGMENTS, segmentCounts, segmentLabel } from "@/lib/marketing";
import { DAILY_EMAIL_LIMIT, isMarketingConfigured, queueOverview, RESERVED_FOR_ORDERS } from "@/lib/marketing-engine";
import { estimatedDays } from "@/lib/marketing-render";

export const metadata = { title: "Admin · Marketing" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  SENDING: "In invio",
  SENT: "Inviata",
  FAILED: "Invio fallito",
  SCHEDULED: "Programmata",
  CANCELED: "Annullata",
};

const fmt = (d: Date) => d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });

export default async function AdminMarketingPage() {
  const configured = isMarketingConfigured();
  const [campaigns, counts, queue, pendingNewsletter, progress] = await Promise.all([
    prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    segmentCounts(),
    queueOverview(),
    prisma.newsletterSubscriber.count({ where: { status: "PENDING" } }),
    prisma.marketingSend.groupBy({ by: ["campaignId", "status"], where: { campaignId: { not: null } }, _count: { _all: true } }),
  ]);
  const sentOf = (id: string) => progress.filter((p) => p.campaignId === id && p.status === "SENT").reduce((a, p) => a + p._count._all, 0);
  const days = estimatedDays(queue.queued, queue.perDay);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Marketing</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/admin/marketing/nuovo" className="btn btn-dark">
          Nuova campagna
        </Link>
        <Link href="/admin/marketing/contatti" className="btn btn-line">
          Contatti
        </Link>
        <Link href="/admin/marketing/automazioni" className="btn btn-line">
          Automazioni
        </Link>
      </div>

      {!configured ? <div className="alert err">RESEND_API_KEY non configurata: le email non possono partire.</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>Iscritti</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{counts.all}</div>
          {pendingNewsletter ? <div className="muted" style={{ fontSize: 12 }}>+{pendingNewsletter} in attesa di conferma</div> : null}
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>Inviate nelle ultime 24 ore</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>
            {queue.sent24h}
            <span className="muted" style={{ fontSize: 15, fontWeight: 400 }}> / {queue.perDay}</span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>Ancora disponibili ora: {queue.freeNow}</div>
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>In coda</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{queue.queued}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {queue.queued ? (days === Infinity ? "In attesa di posti liberi" : `Circa ${days} ${days === 1 ? "giorno" : "giorni"} per completare`) : "Niente in attesa"}
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Piano gratuito di Resend: {DAILY_EMAIL_LIMIT} email in 24 ore in totale. Ne restano sempre {RESERVED_FOR_ORDERS} libere per le
          email degli ordini, quindi al massimo {queue.perDay} di marketing al giorno: le campagne più grandi partono a blocchi nei giorni
          successivi, da sole. La coda gira dopo le visite al sito (al massimo ogni 15 minuti) e ogni mattina alle 9.
        </span>
        {queue.queued && configured ? <AdminMarketingQueueButton disabled={queue.freeNow === 0} /> : null}
      </div>

      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <b>Gruppi di destinatari</b>
        <span className="muted" style={{ fontSize: 13 }}>
          Automatici: interessi scelti nel modulo newsletter o assegnati da Contatti, giochi già acquistati, clienti con almeno un ordine
          pagato, rivenditori approvati.
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SEGMENTS.map((s) => (
            <span key={s.key} className="pill">
              {s.label}: <b>{counts[s.key]}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Oggetto</th>
              <th>Stato</th>
              <th>Destinatari</th>
              <th>Avanzamento</th>
              <th>Data</th>
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
                <td>{segmentLabel(c.segmentKey)}</td>
                <td>{c.recipientCount ? `${sentOf(c.id)} / ${c.recipientCount}` : "—"}</td>
                <td>
                  {c.status === "SCHEDULED" && c.scheduledAt ? `prog. ${fmt(c.scheduledAt)}` : c.sentAt ? fmt(c.sentAt) : c.createdAt.toLocaleDateString("it-IT")}
                </td>
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
