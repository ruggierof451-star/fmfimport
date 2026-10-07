import { AdminNewProductForm } from "@/components/admin-new-product-form";
import { BackButton } from "@/components/back-button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Nuovo prodotto" };

export default async function AdminNewProductPage() {
  const types = await prisma.product.findMany({
    select: { type: true },
    distinct: ["type"],
    orderBy: { type: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton fallbackHref="/admin/prodotti" />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Nuovo prodotto</h1>
      <AdminNewProductForm existingTypes={types.map((t) => t.type)} />
    </div>
  );
}
