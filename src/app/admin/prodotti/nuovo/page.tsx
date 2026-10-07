import { AdminNewProductForm } from "@/components/admin-new-product-form";

export const metadata = { title: "Admin · Nuovo prodotto" };

export default function AdminNewProductPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Nuovo prodotto</h1>
      <AdminNewProductForm />
    </div>
  );
}
