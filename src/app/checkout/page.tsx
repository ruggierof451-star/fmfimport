import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckoutForm } from "@/components/checkout-form";
import { getPricingSettings } from "@/lib/settings";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const settings = await getPricingSettings();
  return (
    <>
      <Header />
      <CheckoutForm invoiceVatRateBps={settings.invoiceVatRateBps} />
      <Footer />
    </>
  );
}
