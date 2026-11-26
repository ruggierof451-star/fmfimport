import { getPricingSettings } from "@/lib/settings";
import { AdminPricingForm } from "@/components/admin-pricing-form";
import { BackButton } from "@/components/back-button";

export const metadata = { title: "Admin · Impostazioni" };

export default async function AdminSettingsPage() {
  const settings = await getPricingSettings();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Impostazioni</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
        Il prezzo di ogni prodotto si imposta a mano dalla sua pagina in <a href="/admin/prodotti">Prodotti</a>. Qui
        restano solo le regole valide per tutto il sito: IVA in fattura e spedizione.
      </p>
      <AdminPricingForm settings={settings} />
    </div>
  );
}
