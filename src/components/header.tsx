import { getSession } from "@/lib/auth";
import { getPricingSettings } from "@/lib/settings";
import { formatEuro } from "@/lib/pricing";
import { HeaderClient } from "@/components/header-client";

export async function Header({ activeKey = "" }: { activeKey?: string }) {
  const session = await getSession();
  const settings = await getPricingSettings();
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span>
            <b>Spedizione gratuita</b> sopra {formatEuro(settings.freeShippingThresholdCents)}
          </span>
          <span>
            <b>Prezzo quantità</b> oltre {settings.bulkThresholdQty} pezzi per articolo
          </span>
          <span>
            <b>Prezzi visibili</b> senza registrazione
          </span>
        </div>
      </div>
      <HeaderClient isLoggedIn={!!session} activeKey={activeKey} />
    </>
  );
}
