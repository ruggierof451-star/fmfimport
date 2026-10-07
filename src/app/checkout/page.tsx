import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <CheckoutForm />
      <Footer />
    </>
  );
}
