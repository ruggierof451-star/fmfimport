import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminMarketingSyncButton } from "@/components/admin-marketing-sync-button";
import { isMarketingConfigured, pendingSyncEmails, SEGMENTS, segmentCounts, segmentLabel } from "@/lib/marketing";
import { refreshScheduledCampaigns } from "@/lib/marketing-actions";

export const metadata = { title: "Admin · Marketing" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  SENDING: "Invio in corso…",
  SENT: "Inviata",
  FAILED: "Invio fallito",
  SCHEDULED: "Programmata",
  CANCELED: "Annullata",
};

const fmt = (d: Date) => d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });

export default async function AdminMarketingPage() {
  await refreshScheduledCampaigns();
  const configured = isMarketingConfigured();
  const [campaigns, counts, pending, pendingNewsletter, confirmedNewsletter, optInUsers] = await Promise.all([
    prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    segmentCounts(),
    pendingSyncEmails(),
    prisma.newsletterSubscriber.count({ where: { status: "PENDING" } }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
    prisma.user.count({ where: { marketingOptIn: true } }),
  ]);
  const webhookConfigured = !!process.env.RESEND_WEBHOOK_SECRET;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Marketing</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
        Campagne email inviate con Resend solo a chi ha dato il consenso: utenti con la spunta in registrazione o
        nell&apos;account e iscritti alla newsletter del sito che hanno confermato via email. Ogni email ha il link di
        disiscrizione gestito da Resend.
      </p>

      {!configured ? <div className="alert err">RESEND_API_KEY non configurata: le campagne non possono partire.</div> : null}
      {configured && !webhookConfigured ? (
        <div className="alert info">
          Manca RESEND_WEBHOOK_SECRET: chi si disiscrive da un link nelle email viene escluso da Resend, ma qui nel sito
          risulta ancora iscritto finché non colleghi il webhook (vedi istruzioni nell&apos;aggiornamento).
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>Iscritti totali</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{counts.all}</div>
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>Utenti con consenso</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{optInUsers}</div>
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>Newsletter confermati</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{confirmedNewsletter}</div>
        </div>
        <div className="admin-card">
          <div className="muted" style={{ fontSize: 13 }}>In attesa di conferma</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{pendingNewsletter}</div>
        </div>
      </div>

      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <b>Gruppi di destinatari</b>
        <span className="muted" style={{ fontSize: 13 }}>
          Calcolati in automatico: interessi scelti nel modulo newsletter, giochi già acquistati, clienti con almeno un
          ordine pagato, rivenditori approvati. Si aggiornano da soli su Resend a ogni iscrizione, ordine pagato o
          disiscrizione.
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SEGMENTS.map((s) => (
            <span key={s.key} className="pill">
              {s.label}: <b>{counts[s.key]}</b>
            </span>
          ))}
        </div>
        {configured ? <AdminMarketingSyncButton pending={pending.total} /> : null}
      </div>

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
              <th>Invio</th>
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
                  {segmentLabel(c.segmentKey)}
                  {c.recipientCount != null ? ` · ${c.recipientCount}` : ""}
                </td>
                <td>{c.createdAt.toLocaleDateString("it-IT")}</td>
                <td>{c.sentAt ? fmt(c.sentAt) : c.scheduledAt && c.status === "SCHEDULED" ? `prog. ${fmt(c.scheduledAt)}` : "—"}</td>
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
