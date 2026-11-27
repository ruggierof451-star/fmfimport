import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminCampaignForm } from "@/components/admin-campaign-form";
import { SEGMENTS, segmentCounts, segmentLabel } from "@/lib/marketing";
import { campaignStats, MARKETING_PER_DAY } from "@/lib/marketing-engine";
import { MARKETING_FOOTER_HTML, marketingBaseHtml } from "@/lib/email";
import { ensureUnsubscribe, injectPreheader, isFullDocument, personalize } from "@/lib/marketing-render";
import { absoluteUrl } from "@/lib/site";

export const metadata = { title: "Admin · Campagna marketing" };

const rate = (part: number, total: number) => (total ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "—");

export default async function AdminMarketingCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, counts] = await Promise.all([prisma.marketingCampaign.findUnique({ where: { id } }), segmentCounts()]);
  if (!campaign) notFound();
  const stats = campaign.status === "DRAFT" ? null : await campaignStats(campaign.id);

  let preview = marketingBaseHtml({ subject: campaign.subject, previewText: campaign.previewText, bodyHtml: campaign.bodyHtml });
  if (isFullDocument(campaign.bodyHtml)) preview = injectPreheader(preview, campaign.previewText);
  preview = ensureUnsubscribe(personalize(preview, { firstName: "Mario", email: "mario@esempio.it" }), absoluteUrl("/"), MARKETING_FOOTER_HTML);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>{campaign.subject}</h1>

      {stats ? (
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
          <b>Risultati · {segmentLabel(campaign.segmentKey)}</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
            {[
              ["Destinatari", String(stats.total)],
              ["Inviate", String(stats.sent)],
              ["In coda", String(stats.queued)],
              ["Aperte", `${stats.opened} · ${rate(stats.opened, stats.sent)}`],
              ["Hanno cliccato", `${stats.clicked} · ${rate(stats.clicked, stats.sent)}`],
              ["Disiscritti", String(stats.unsubscribed)],
              ["Non riuscite", String(stats.failed)],
              ["Saltate", String(stats.skipped)],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="muted" style={{ fontSize: 12 }}>{label}</div>
                <div style={{ fontSize: 19, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
          <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Le aperture sono indicative: alcuni programmi di posta (es. Apple Mail) caricano le immagini in automatico e contano come
            aperte, altri le bloccano. I clic sono affidabili. &quot;Saltate&quot;: persone che si sono disiscritte prima del loro turno.
            {stats.lastError ? ` Ultimo errore: ${stats.lastError}` : ""}
          </span>
          {stats.links.length ? (
            <>
              <b style={{ fontSize: 14 }}>Link più cliccati</b>
              <table className="admin">
                <thead>
                  <tr>
                    <th>Link</th>
                    <th>Clic</th>
                    <th>Persone</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.links.map((l) => (
                    <tr key={l.url}>
                      <td style={{ wordBreak: "break-all" }}>{l.url}</td>
                      <td>{l.clicks}</td>
                      <td>{l.people}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
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
          sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
          scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.toISOString() : null,
          failed: stats?.failed ?? 0,
        }}
        segments={SEGMENTS.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] }))}
        perDay={MARKETING_PER_DAY}
      />

      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>
        <b>Anteprima (ultima versione salvata, con nome di esempio &quot;Mario&quot;)</b>
        <iframe
          title="Anteprima email"
          sandbox=""
          srcDoc={preview}
          style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 10, background: "#F0F0F0" }}
        />
      </div>
    </div>
  );
}
