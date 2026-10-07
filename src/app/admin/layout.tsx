import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/account");

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, padding: "6px 12px 18px", display: "block" }}>
          FMF <span style={{ color: "var(--gold)" }}>Admin</span>
        </Link>
        <AdminNav />
        <div style={{ marginTop: "auto", padding: "12px", color: "#8C8C8C", fontSize: 12 }}>{admin.email}</div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
