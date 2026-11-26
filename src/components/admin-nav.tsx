"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Panoramica" },
  { href: "/admin/guadagni", label: "Guadagni" },
  { href: "/admin/prodotti", label: "Prodotti" },
  { href: "/admin/ordini", label: "Ordini" },
  { href: "/admin/etichette", label: "Etichette" },
  { href: "/admin/messaggi", label: "Messaggi" },
  { href: "/admin/rivenditori", label: "Rivenditori" },
  { href: "/admin/impostazioni", label: "Impostazioni" },
  { href: "/admin/utenti", label: "Utenti admin" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-nav">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? "on" : ""}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
