import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminCampaignForm } from "@/components/admin-campaign-form";
import { getBroadcastStats, isMarketingConfigured, SEGMENTS, segmentCounts } from "@/lib/marketing";
import { refreshScheduledCampaigns } from "@/lib/marketing-actions";
import { renderMarketingEmail } from "@/lib/email";

export const metadata = { title: "Admin · Campagna marketing" };

// Tassi calcolati qui dai conteggi, così non dipendono dal formato restituito da Resend.
const rate = (part: number | undefined, total: number | undefined) =>
  part == null || !total ? "—" : `${((part / total) * 100).toFixed(1).replace(".", ",")}%`;

export default async function AdminMarketingCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await refreshScheduledCampaigns();
  const [campaign, counts] = await Promise.all([prisma.marketingCampaign.findUnique({ where: { id } }), segmentCounts()]);
  if (!campaign) notFound();

  const stats =
    campaign.status === "SENT" && campaign.resendBroadcastId && isMarketingConfigured()
      ? await getBroadcastStats(campaign.resendBroadcastId)
      : null;
  const t = stats?.totals ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>{campaign.subject}</h1>

      {stats ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 }}>
          <b>Risultati</b>
          {t ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
              {[
                ["Consegnate", t.delivered ?? t.sent],
                ["Aperte (uniche)", t.unique_opened],
                ["Tasso apertura", rate(t.unique_opened, t.delivered ?? t.sent)],
                ["Clic (unici)", t.unique_clicked],
                ["Tasso clic", rate(t.unique_clicked, t.delivered ?? t.sent)],
                ["Disiscritti", t.unsubscribed],
                ["Rimbalzate", t.bounced],
                ["Segnalate spam", t.complained],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="muted" style={{ fontSize: 12 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{value ?? "—"}</div>
                </div>
              ))}
            </div>
          ) : (
            <span className="muted" style={{ fontSize: 13 }}>
              Aperture e clic non ancora disponibili da qui ({stats.totalsError}). Li trovi nella sezione Broadcasts della
              dashboard Resend; i dati arrivano anche qualche minuto dopo l&apos;invio.
            </span>
          )}
          <b style={{ fontSize: 14 }}>Link più cliccati</b>
          {stats.links.length ? (
            <table className="admin">
              <thead>
                <tr>
                  <th>Link</th>
                  <th>Clic</th>
                  <th>Unici</th>
                </tr>
              </thead>
              <tbody>
                {stats.links.slice(0, 10).map((l) => (
                  <tr key={l.url}>
                    <td style={{ wordBreak: "break-all" }}>{l.url}</td>
                    <td>{l.clicks}</td>
                    <td>{l.uniqueClicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className="muted" style={{ fontSize: 13 }}>{stats.linksError ? `Non disponibili: ${stats.linksError}` : "Nessun clic per ora."}</span>
          )}
        </div>
      ) : null}

      <AdminCampaignForm
        campaign={{
          id: campaign.id,
          subject: campaign.subject,
          previewText: campaign.previewText,
          bodyHtml: campaign.bodyHtml,
          segmentKey: campaign.segmentKey,
          status: campaign.status,
          recipientCount: campaign.recipientCount,
          failedCount: campaign.failedCount,
          sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
          scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.toISOString() : null,
        }}
        segments={SEGMENTS.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] }))}
      />

      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680 }}>
        <b>Anteprima email (ultima versione salvata)</b>
        <iframe
          title="Anteprima email"
          sandbox=""
          srcDoc={renderMarketingEmail({ subject: campaign.subject, previewText: campaign.previewText, bodyHtml: campaign.bodyHtml, forTest: true })}
          style={{ width: "100%", height: 560, border: "1px solid var(--line)", borderRadius: 10, background: "#F0F0F0" }}
        />
      </div>
    </div>
  );
}
