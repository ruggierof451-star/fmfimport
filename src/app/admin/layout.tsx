import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { LogoutButton } from "@/components/logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/account");

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, padding: "6px 12px 18px", display: "block" }}>
          FMF <span style={{ color: "var(--gold)" }}>Admin</span>
        </Link>
        <Link
          href="/"
          style={{
            color: "#fff",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            margin: "0 0 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,.08)",
          }}
        >
          ← Torna al sito
        </Link>
        <AdminNav />
        <div style={{ marginTop: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#8C8C8C", fontSize: 12 }}>{admin.email}</div>
          <LogoutButton className="admin-logout" redirectTo="/" />
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
