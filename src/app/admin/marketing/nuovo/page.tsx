import { BackButton } from "@/components/back-button";
import { AdminNewCampaignForm } from "@/components/admin-new-campaign-form";

export const metadata = { title: "Admin · Nuova campagna marketing" };

export default function AdminNewMarketingCampaignPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Nuova campagna</h1>
      <AdminNewCampaignForm />
    </div>
  );
}
