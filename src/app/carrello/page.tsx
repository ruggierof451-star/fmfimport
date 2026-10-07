import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartPageClient } from "@/components/cart-page-client";

export const metadata = { title: "Carrello" };

export default function CartPage() {
  return (
    <>
      <Header />
      <CartPageClient />
      <Footer />
    </>
  );
}
