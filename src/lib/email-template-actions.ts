"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getTemplateDef, sampleValues } from "@/lib/email-templates";
import { sendTemplatePreview } from "@/lib/email";

const saveSchema = z.object({
  key: z.string().min(1),
  subject: z.string().min(2, "Scrivi un oggetto.").max(200),
  bodyHtml: z.string().min(1, "Scrivi il contenuto dell'email."),
});

export async function saveEmailTemplateAction(input: z.infer<typeof saveSchema>): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const def = getTemplateDef(parsed.data.key);
  if (!def) return { ok: false, error: "Modello email sconosciuto." };

  await prisma.emailTemplate.upsert({
    where: { key: def.key },
    create: { key: def.key, subject: parsed.data.subject, bodyHtml: parsed.data.bodyHtml, updatedBy: admin.email },
    update: { subject: parsed.data.subject, bodyHtml: parsed.data.bodyHtml, updatedBy: admin.email },
  });

  revalidatePath("/admin/email");
  revalidatePath(`/admin/email/${def.key}`);
  return { ok: true };
}

/** Ripristina il testo predefinito: basta eliminare la personalizzazione. */
export async function resetEmailTemplateAction(input: { key: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.emailTemplate.deleteMany({ where: { key: input.key } });
  revalidatePath("/admin/email");
  revalidatePath(`/admin/email/${input.key}`);
  return { ok: true };
}

/** Invia all'admin una copia di prova con valori d'esempio, senza salvare nulla. */
export async function sendEmailTemplatePreviewAction(input: {
  key: string;
  subject: string;
  bodyHtml: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const def = getTemplateDef(input.key);
  if (!def) return { ok: false, error: "Modello email sconosciuto." };

  const result = await sendTemplatePreview(admin.email, input.subject, input.bodyHtml, sampleValues(def));
  if (!result.ok) return { ok: false, error: result.error ?? "Invio di prova non riuscito." };
  return { ok: true };
}
