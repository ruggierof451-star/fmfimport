import { BackButton } from "@/components/back-button";
import { AdminAutomationForm } from "@/components/admin-automation-form";
import { AUTOMATION_DEFAULTS, automationStats, getAutomation, type AutomationKey } from "@/lib/marketing-engine";

export const metadata = { title: "Admin · Automazioni email" };

const KEYS: AutomationKey[] = ["welcome", "abandoned_order"];

export default async function AdminMarketingAutomationsPage() {
  const items = await Promise.all(KEYS.map(async (key) => ({ key, auto: await getAutomation(key), stats: await automationStats(key) })));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Automazioni</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
        Email che partono da sole quando succede qualcosa. Arrivano solo a chi ha dato il consenso marketing, una volta sola, e
        hanno la precedenza sulle campagne nel limite giornaliero. Nascono disattivate: controlla il testo, mandati una prova e poi
        attivale.
      </p>
      {items.map(({ key, auto, stats }) => (
        <AdminAutomationForm
          key={key}
          automation={{ key, enabled: auto.enabled, subject: auto.subject, bodyHtml: auto.bodyHtml, delayHours: auto.delayHours }}
          title={AUTOMATION_DEFAULTS[key].title}
          description={AUTOMATION_DEFAULTS[key].description}
          stats={stats}
        />
      ))}
    </div>
  );
}
