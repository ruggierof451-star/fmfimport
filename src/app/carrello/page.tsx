import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartPageClient } from "@/components/cart-page-client";

// Pagina personale o di servizio: fuori da Google.
export const metadata = { title: "Carrello", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <>
      <Header />
      <CartPageClient />
      <Footer />
    </>
  );
}
