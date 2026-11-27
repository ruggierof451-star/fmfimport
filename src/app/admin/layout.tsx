import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { LogoutButton } from "@/components/logout-button";

// Pannello admin: mai indicizzato (oltre al Disallow in robots.txt).
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/account");

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/" className="admin-brand" aria-label="FMF Cards Admin">
          <Image src="/fmf-cards-logo-dark.png" alt="FMF Cards" width={720} height={497} sizes="150px" style={{ width: 150, height: "auto" }} />
          <span style={{ color: "var(--gold)", fontSize: 12, letterSpacing: ".18em", display: "block", marginTop: 4 }}>ADMIN</span>
        </Link>
        <Link href="/" className="admin-back">
          ← Torna al sito
        </Link>
        <AdminNav />
        <div className="admin-foot">
          <div className="admin-foot-email">{admin.email}</div>
          <LogoutButton className="admin-logout" redirectTo="/" />
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
