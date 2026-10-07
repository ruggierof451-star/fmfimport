import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckoutForm } from "@/components/checkout-form";
import { getPricingSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [settings, user] = await Promise.all([getPricingSettings(), getCurrentUser()]);
  const defaultAddress = user
    ? await prisma.address.findFirst({ where: { userId: user.id, isDefault: true } })
    : null;

  return (
    <>
      <Header />
      <CheckoutForm
        invoiceVatRateBps={settings.invoiceVatRateBps}
        prefill={
          user
            ? {
                email: user.email,
                companyName: user.companyName ?? "",
                vatNumber: user.vatNumber ?? "",
                sdiCode: user.sdiCode ?? "",
                ...(defaultAddress
                  ? {
                      firstName: defaultAddress.fullName.split(" ")[0] ?? "",
                      lastName: defaultAddress.fullName.split(" ").slice(1).join(" "),
                      street: defaultAddress.street,
                      postalCode: defaultAddress.postalCode,
                      city: defaultAddress.city,
                      province: defaultAddress.province,
                      phone: defaultAddress.phone ?? "",
                    }
                  : {}),
              }
            : undefined
        }
      />
      <Footer />
    </>
  );
}
