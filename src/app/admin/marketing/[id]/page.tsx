import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminCampaignForm } from "@/components/admin-campaign-form";

export const metadata = { title: "Admin · Campagna marketing" };

export default async function AdminMarketingCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, subscriberCount] = await Promise.all([
    prisma.marketingCampaign.findUnique({ where: { id } }),
    prisma.user.count({ where: { marketingOptIn: true } }),
  ]);
  if (!campaign) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>{campaign.subject}</h1>
      <AdminCampaignForm
        campaign={{
          id: campaign.id,
          subject: campaign.subject,
          bodyHtml: campaign.bodyHtml,
          status: campaign.status,
          recipientCount: campaign.recipientCount,
          failedCount: campaign.failedCount,
          sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
        }}
        subscriberCount={subscriberCount}
      />
    </div>
  );
}
