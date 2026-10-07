import { getPricingSettings } from "@/lib/settings";
import { AdminPricingForm } from "@/components/admin-pricing-form";

export const metadata = { title: "Admin · Regole di prezzo" };

export default async function AdminSettingsPage() {
  const settings = await getPricingSettings();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Regole di prezzo</h1>
      <AdminPricingForm settings={settings} />
    </div>
  );
}
