import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminProductForm } from "@/components/admin-product-form";
import { BackButton } from "@/components/back-button";
import { cleanProductName } from "@/lib/product-art";

export const metadata = { title: "Admin · Modifica prodotto" };

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, changeLogs, types] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.productChangeLog.findMany({ where: { productId: id }, orderBy: { changedAt: "desc" }, take: 20 }),
    prisma.product.findMany({ select: { type: true }, distinct: ["type"], orderBy: { type: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton fallbackHref="/admin/prodotti" />
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>{cleanProductName(product.name)}</h1>
      <p className="muted" style={{ margin: 0 }}>
        Nome fornitore originale: {product.name} · Slug: {product.slug}
      </p>
      <AdminProductForm product={product} existingTypes={types.map((t) => t.type)} />

      <div className="admin-card">
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Registro modifiche</h2>
        {changeLogs.length ? (
          <table className="admin">
            <thead>
              <tr>
                <th>Data</th>
                <th>Campo</th>
                <th>Da</th>
                <th>A</th>
                <th>Operatore</th>
              </tr>
            </thead>
            <tbody>
              {changeLogs.map((c) => (
                <tr key={c.id}>
                  <td>{c.changedAt.toLocaleString("it-IT")}</td>
                  <td>{c.field}</td>
                  <td>{c.oldValue ?? "—"}</td>
                  <td>{c.newValue ?? "—"}</td>
                  <td>{c.changedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Nessuna modifica registrata.
          </p>
        )}
      </div>
    </div>
  );
}
