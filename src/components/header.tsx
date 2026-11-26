import { getSession } from "@/lib/auth";
import { getPricingSettings } from "@/lib/settings";
import { formatEuro } from "@/lib/pricing";
import { HeaderClient } from "@/components/header-client";

export async function Header({ activeKey = "", transparent }: { activeKey?: string; transparent?: boolean }) {
  const session = await getSession();
  const settings = await getPricingSettings();
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span>
            <b>Spedizione gratuita</b> per ordini superiori a {formatEuro(settings.freeShippingThresholdCents)}
          </span>
          <span>
            <b>5% di sconto</b> sul tuo primo acquisto col codice <b>FMFCARDS</b>
          </span>
          <span>
            <b>Reso</b> entro 14 giorni
          </span>
        </div>
      </div>
      <HeaderClient isLoggedIn={!!session} activeKey={activeKey} transparent={transparent} />
    </>
  );
}
