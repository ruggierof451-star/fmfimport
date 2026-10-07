"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Panoramica" },
  { href: "/admin/prodotti", label: "Prodotti" },
  { href: "/admin/ordini", label: "Ordini" },
  { href: "/admin/import", label: "Importazione catalogo" },
  { href: "/admin/impostazioni", label: "Regole di prezzo" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? "on" : ""}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
