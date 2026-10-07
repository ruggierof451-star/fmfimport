import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { CartProvider } from "@/components/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { Toast } from "@/components/toast";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "FMF Import — Pokémon e One Piece sigillati dall'Asia",
    template: "%s · FMF Import",
  },
  description:
    "Booster box, display e prodotti sigillati Pokémon e One Piece in edizione giapponese, cinese e coreana. Prezzi visibili senza registrazione.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={poppins.variable}>
      <body>
        <CartProvider>
          <div id="app">{children}</div>
          <CartDrawer />
          <Toast />
        </CartProvider>
      </body>
    </html>
  );
}
