import { BackButton } from "@/components/back-button";
import { AdminMarketingContacts } from "@/components/admin-marketing-contacts";
import { listContacts, SEGMENTS } from "@/lib/marketing";

export const metadata = { title: "Admin · Contatti marketing" };

export default async function AdminMarketingContactsPage() {
  const contacts = await listContacts();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Contatti</h1>
      <AdminMarketingContacts
        contacts={contacts.map((c) => ({ ...c, since: c.since ? c.since.toISOString() : null }))}
        segments={SEGMENTS.map((s) => ({ key: s.key, label: s.label }))}
      />
    </div>
  );
}
