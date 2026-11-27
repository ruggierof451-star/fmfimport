import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { EMAIL_TEMPLATES } from "@/lib/email-templates";

export const metadata = { title: "Admin · Email automatiche" };

export default async function AdminEmailTemplatesPage() {
  const custom = await prisma.emailTemplate.findMany({ select: { key: true, updatedAt: true, updatedBy: true } });
  const customByKey = new Map(custom.map((c) => [c.key, c]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Email automatiche</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
        Tutte le email che il sito manda da solo. Puoi cambiarne oggetto e testo, provarle sul tuo indirizzo e
        tornare in qualsiasi momento al testo originale. Per le campagne promozionali c&apos;è invece la sezione{" "}
        <Link href="/admin/marketing">Marketing</Link>.
      </p>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Email</th>
              <th>Quando parte</th>
              <th>A chi</th>
              <th>Testo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {EMAIL_TEMPLATES.map((t) => {
              const c = customByKey.get(t.key);
              return (
                <tr key={t.key}>
                  <td>
                    <b>{t.label}</b>
                  </td>
                  <td className="muted" style={{ maxWidth: 420 }}>
                    {t.trigger}
                  </td>
                  <td>{t.recipient}</td>
                  <td>
                    <span className="badge-status">{c ? "Personalizzato" : "Predefinito"}</span>
                  </td>
                  <td>
                    <Link className="btn btn-line btn-sm" href={`/admin/email/${t.key}`}>
                      Modifica
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
