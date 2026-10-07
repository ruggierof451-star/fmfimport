import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AdminNewAdminForm } from "@/components/admin-new-admin-form";
import { AdminRevokeButton } from "@/components/admin-revoke-button";

export const metadata = { title: "Admin · Utenti admin" };

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Utenti admin</h1>
      <p className="muted" style={{ margin: 0 }}>
        Chi ha accesso completo alla dashboard (prodotti, ordini, prezzi, importazione, altri admin).
      </p>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Admin dal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.name ?? "—"}</td>
                <td>{a.email}</td>
                <td>{a.createdAt.toLocaleDateString("it-IT")}</td>
                <td>{a.id !== me?.id ? <AdminRevokeButton userId={a.id} email={a.email} /> : <span className="muted">Tu</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Crea nuovo admin</h2>
      <AdminNewAdminForm />
    </div>
  );
}
