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
            <b>Spedizione gratuita</b> sopra {formatEuro(settings.freeShippingThresholdCents)}
          </span>
          <span>
            <b>Pagamenti sicuri</b> carta, PayPal, bonifico
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
