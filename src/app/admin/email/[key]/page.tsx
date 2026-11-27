import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminEmailTemplateForm } from "@/components/admin-email-template-form";
import { getTemplateDef } from "@/lib/email-templates";

export const metadata = { title: "Admin · Modifica email automatica" };

export default async function AdminEmailTemplatePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = getTemplateDef(key);
  if (!def) notFound();

  const custom = await prisma.emailTemplate.findUnique({ where: { key } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton fallbackHref="/admin/email" />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>{def.label}</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
        {def.trigger} Destinatario: <b style={{ color: "var(--ink)" }}>{def.recipient.toLowerCase()}</b>.
      </p>
      <AdminEmailTemplateForm
        templateKey={def.key}
        initialSubject={custom?.subject ?? def.defaultSubject}
        initialBody={custom?.bodyHtml ?? def.defaultBody}
        isCustom={!!custom}
        placeholders={def.placeholders}
      />
    </div>
  );
}
