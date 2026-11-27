import { requireAdmin } from "@/lib/auth";
import { listContacts } from "@/lib/marketing";

/** Esporta i contatti marketing in CSV (solo admin). */
export async function GET() {
  if (!(await requireAdmin())) return new Response("Non autorizzato.", { status: 401 });
  const rows = await listContacts();
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    "email,nome,stato,provenienza,gruppi,interessi,dal",
    ...rows.map((r) =>
      [
        r.email,
        r.firstName ?? "",
        r.status === "SUBSCRIBED" ? "iscritto" : "in attesa di conferma",
        r.sources.join(" "),
        r.segments.join(" "),
        r.interests.join(" "),
        r.since ? r.since.toISOString().slice(0, 10) : "",
      ]
        .map(esc)
        .join(",")
    ),
  ];
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatti-fmfcards-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
