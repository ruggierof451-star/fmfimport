"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendMarketingCampaign } from "@/lib/email";

const campaignSchema = z.object({
  subject: z.string().min(2, "Scrivi un oggetto.").max(150),
  bodyHtml: z.string().min(1, "Scrivi il contenuto dell'email."),
});

export async function createMarketingCampaignAction(
  input: z.infer<typeof campaignSchema>
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  const created = await prisma.marketingCampaign.create({
    data: { ...parsed.data, createdBy: admin.email },
  });

  revalidatePath("/admin/marketing");
  return { ok: true, id: created.id };
}

export async function updateMarketingCampaignAction(
  input: { id: string } & z.infer<typeof campaignSchema>
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  const existing = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Campagna non trovata." };
  if (existing.status !== "DRAFT") return { ok: false, error: "Una campagna già inviata non si può modificare." };

  await prisma.marketingCampaign.update({ where: { id: input.id }, data: parsed.data });
  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${input.id}`);
  return { ok: true };
}

export async function deleteMarketingCampaignAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const existing = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Campagna non trovata." };
  if (existing.status !== "DRAFT") return { ok: false, error: "Una campagna già inviata non si può eliminare (resta come storico)." };

  await prisma.marketingCampaign.delete({ where: { id: input.id } });
  revalidatePath("/admin/marketing");
  return { ok: true };
}

/** Invia una copia di prova della campagna solo all'admin che la richiede, senza toccare lo stato della campagna. */
export async function sendTestMarketingEmailAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!campaign) return { ok: false, error: "Campagna non trovata." };

  const result = await sendMarketingCampaign([{ userId: admin.id, email: admin.email }], `[PROVA] ${campaign.subject}`, campaign.bodyHtml);
  if (result.sent === 0) return { ok: false, error: "Invio di prova non riuscito. Controlla che RESEND_API_KEY sia configurata." };
  return { ok: true };
}

/** Invia la campagna a tutti gli utenti iscritti (marketingOptIn=true). Una volta inviata non è più modificabile. */
export async function sendMarketingCampaignAction(input: { id: string }): Promise<{ ok: boolean; error?: string; sent?: number; failed?: number }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!campaign) return { ok: false, error: "Campagna non trovata." };
  if (campaign.status !== "DRAFT") return { ok: false, error: "Questa campagna è già stata inviata." };

  const subscribers = await prisma.user.findMany({
    where: { marketingOptIn: true },
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) {
    return { ok: false, error: "Nessun iscritto alle email di marketing al momento." };
  }

  await prisma.marketingCampaign.update({ where: { id: input.id }, data: { status: "SENDING" } });

  const { sent, failed } = await sendMarketingCampaign(
    subscribers.map((s) => ({ userId: s.id, email: s.email })),
    campaign.subject,
    campaign.bodyHtml
  );

  await prisma.marketingCampaign.update({
    where: { id: input.id },
    data: {
      status: sent > 0 ? "SENT" : "FAILED",
      recipientCount: sent,
      failedCount: failed,
      sentAt: new Date(),
    },
  });

  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${input.id}`);
  return { ok: sent > 0, sent, failed, error: sent > 0 ? undefined : "Invio non riuscito." };
}
