import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AdminNewAdminForm } from "@/components/admin-new-admin-form";
import { AdminRevokeButton } from "@/components/admin-revoke-button";
import { AdminSetResellerForm } from "@/components/admin-set-reseller-form";
import { AdminRevokeResellerButton } from "@/components/admin-revoke-reseller-button";
import { BackButton } from "@/components/back-button";

export const metadata = { title: "Admin · Utenti" };

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const [admins, resellers] = await Promise.all([
    prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ where: { role: "RESELLER" }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Utenti admin</h1>
      <p className="muted" style={{ margin: 0 }}>
        Chi ha accesso completo alla dashboard (prodotti, ordini, prezzi, altri admin).
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

      <hr style={{ border: "none", borderTop: "1px solid #2A2A2A", margin: "8px 0" }} />

      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Rivenditori</h2>
      <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
        Account con accesso al listino rivenditore (vedi le richieste approvate in{" "}
        <a href="/admin/rivenditori">Rivenditori</a>). Il cliente deve avere già un account registrato sul sito.
      </p>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>P.IVA</th>
              <th>Rivenditore dal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {resellers.map((r) => (
              <tr key={r.id}>
                <td>{r.name ?? "—"}</td>
                <td>{r.email}</td>
                <td>{r.vatNumber ?? "—"}</td>
                <td>{r.updatedAt.toLocaleDateString("it-IT")}</td>
                <td>
                  <AdminRevokeResellerButton userId={r.id} email={r.email} />
                </td>
              </tr>
            ))}
            {resellers.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nessun rivenditore attivo.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminSetResellerForm />
    </div>
  );
}
