import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { CartProvider } from "@/components/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { Toast } from "@/components/toast";
import { CookieConsent } from "@/components/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import { after } from "next/server";
import { maybeProcessQueue } from "@/lib/marketing-engine";
import { CANONICAL_ORIGIN, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], // il 300 non è usato da nessuno stile: non scaricarlo
  variable: "--font-poppins",
});

const DEFAULT_DESCRIPTION =
  "Booster box, display e prodotti sigillati Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball, in edizione italiana e di importazione. Prezzi visibili senza registrazione.";

// metadataBase: ogni URL relativo nei metadati (canonical, Open Graph, immagini) diventa
// assoluto sul dominio ufficiale, mai sul dominio tecnico di Vercel. Il canonical NON è
// impostato qui (varrebbe per tutte le pagine): ogni pagina pubblica dichiara il suo,
// quelle private sono noindex.
export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "FMF Cards — Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball sigillati",
    template: "%s · FMF Cards",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "it_IT",
    title: "FMF Cards — Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball sigillati",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE.url] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Email marketing: dopo aver servito la pagina, se è il momento lavora la coda (al
  // massimo ogni 15 minuti), così gli invii programmati partono anche senza Vercel Pro.
  after(maybeProcessQueue);
  return (
    <html lang="it" className={poppins.variable}>
      <body>
        <CartProvider>
          <div id="app">{children}</div>
          <CartDrawer />
          <Toast />
          <CookieConsent />
        </CartProvider>
        {/* Vercel Web Analytics: visite e pagine viste, senza cookie (non serve consenso). */}
        <Analytics />
      </body>
    </html>
  );
}
