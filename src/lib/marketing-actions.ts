"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { renderMarketingEmail } from "@/lib/email";
import {
  cancelBroadcast,
  createAndSendBroadcast,
  getBroadcastStatus,
  isMarketingConfigured,
  MarketingError,
  pendingSyncEmails,
  SEGMENT_KEYS,
  segmentCounts,
  segmentLabel,
  sendTestEmail,
  syncContact,
  type SegmentKey,
} from "@/lib/marketing";

const campaignSchema = z.object({
  subject: z.string().trim().min(2, "Scrivi un oggetto.").max(150),
  previewText: z.string().trim().max(150, "Anteprima troppo lunga (max 150 caratteri).").optional().nullable(),
  bodyHtml: z.string().min(1, "Scrivi il contenuto dell'email."),
  segmentKey: z.enum(SEGMENT_KEYS as [SegmentKey, ...SegmentKey[]]).default("all"),
});

type Result = { ok: boolean; error?: string };

function errorMessage(err: unknown): string {
  if (err instanceof MarketingError) return err.message;
  console.error("[marketing]", err);
  return "Operazione non riuscita. Riprova tra poco.";
}

function revalidateCampaign(id?: string) {
  revalidatePath("/admin/marketing");
  if (id) revalidatePath(`/admin/marketing/${id}`);
}

export async function createMarketingCampaignAction(
  input: z.input<typeof campaignSchema>
): Promise<Result & { id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  const created = await prisma.marketingCampaign.create({
    data: { ...parsed.data, previewText: parsed.data.previewText || null, createdBy: admin.email },
  });
  revalidateCampaign();
  return { ok: true, id: created.id };
}

export async function updateMarketingCampaignAction(input: { id: string } & z.input<typeof campaignSchema>): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  const existing = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Campagna non trovata." };
  if (existing.status !== "DRAFT") return { ok: false, error: "Si possono modificare solo le bozze." };

  await prisma.marketingCampaign.update({
    where: { id: input.id },
    data: { ...parsed.data, previewText: parsed.data.previewText || null },
  });
  revalidateCampaign(input.id);
  return { ok: true };
}

export async function deleteMarketingCampaignAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const existing = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Campagna non trovata." };
  if (existing.status !== "DRAFT" && existing.status !== "CANCELED") {
    return { ok: false, error: "Una campagna inviata o programmata non si può eliminare (resta come storico)." };
  }
  await prisma.marketingCampaign.delete({ where: { id: input.id } });
  revalidateCampaign();
  return { ok: true };
}

/** Copia di prova solo all'admin che la richiede, senza toccare lo stato della campagna. */
export async function sendTestMarketingEmailAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (!isMarketingConfigured()) return { ok: false, error: "RESEND_API_KEY non configurata." };

  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c) return { ok: false, error: "Campagna non trovata." };
  try {
    await sendTestEmail(admin.email, c.subject, renderMarketingEmail({ subject: c.subject, previewText: c.previewText, bodyHtml: c.bodyHtml, forTest: true }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Invia (o programma) la campagna come Broadcast di Resend al segmento scelto.
 * scheduledAt: data futura in formato ISO; assente = invio immediato.
 */
export async function sendMarketingCampaignAction(input: { id: string; scheduledAt?: string | null }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (!isMarketingConfigured()) return { ok: false, error: "RESEND_API_KEY non configurata." };

  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c) return { ok: false, error: "Campagna non trovata." };
  if (c.status !== "DRAFT") return { ok: false, error: "Questa campagna è già stata inviata o programmata." };

  let scheduledAt: Date | null = null;
  if (input.scheduledAt) {
    scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: "Data di invio non valida." };
    if (scheduledAt.getTime() < Date.now() + 5 * 60_000) return { ok: false, error: "Programma l'invio almeno 5 minuti nel futuro." };
    if (scheduledAt.getTime() > Date.now() + 30 * 24 * 3_600_000) return { ok: false, error: "Si può programmare al massimo 30 giorni avanti." };
  }

  const segmentKey = (SEGMENT_KEYS as string[]).includes(c.segmentKey) ? (c.segmentKey as SegmentKey) : "all";
  const counts = await segmentCounts();
  if (counts[segmentKey] === 0) return { ok: false, error: `Nessun iscritto nel gruppo "${segmentLabel(segmentKey)}".` };

  // Prima di inviare allinea su Resend chi non è ancora stato sincronizzato (pochi alla volta).
  const pending = await pendingSyncEmails(40);
  for (const email of pending.emails) {
    try {
      await syncContact(email);
    } catch (err) {
      console.error("[marketing] sincronizzazione prima dell'invio fallita:", err);
    }
  }

  // Blocca subito la campagna per evitare doppi invii con un doppio clic.
  const locked = await prisma.marketingCampaign.updateMany({ where: { id: c.id, status: "DRAFT" }, data: { status: "SENDING" } });
  if (locked.count === 0) return { ok: false, error: "Questa campagna è già in invio." };

  try {
    const broadcastId = await createAndSendBroadcast({
      name: `${c.subject} · ${new Date().toISOString().slice(0, 10)}`,
      subject: c.subject,
      previewText: c.previewText,
      html: renderMarketingEmail({ subject: c.subject, previewText: c.previewText, bodyHtml: c.bodyHtml }),
      segmentKey,
      scheduledAt,
    });
    await prisma.marketingCampaign.update({
      where: { id: c.id },
      data: {
        resendBroadcastId: broadcastId,
        status: scheduledAt ? "SCHEDULED" : "SENT",
        scheduledAt,
        sentAt: scheduledAt ? null : new Date(),
        recipientCount: counts[segmentKey],
        failedCount: null,
      },
    });
    revalidateCampaign(c.id);
    return { ok: true };
  } catch (err) {
    await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "DRAFT" } });
    revalidateCampaign(c.id);
    return { ok: false, error: errorMessage(err) };
  }
}

/** Annulla una campagna programmata (o ancora in invio) su Resend. */
export async function cancelMarketingCampaignAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c?.resendBroadcastId) return { ok: false, error: "Campagna non trovata." };
  if (c.status !== "SCHEDULED" && c.status !== "SENDING") return { ok: false, error: "Si possono annullare solo campagne programmate." };
  try {
    await cancelBroadcast(c.resendBroadcastId);
    await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "CANCELED" } });
    revalidateCampaign(c.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Riporta in bozza una campagna annullata, per modificarla e rinviarla. */
export async function reopenMarketingCampaignAction(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const c = await prisma.marketingCampaign.findUnique({ where: { id: input.id } });
  if (!c || c.status !== "CANCELED") return { ok: false, error: "Solo una campagna annullata può tornare in bozza." };
  await prisma.marketingCampaign.update({
    where: { id: c.id },
    data: { status: "DRAFT", resendBroadcastId: null, scheduledAt: null, recipientCount: null },
  });
  revalidateCampaign(c.id);
  return { ok: true };
}

/** Aggiorna lo stato delle campagne programmate leggendolo da Resend (programmata → inviata). */
export async function refreshScheduledCampaigns(): Promise<void> {
  if (!(await requireAdmin()) || !isMarketingConfigured()) return;
  const scheduled = await prisma.marketingCampaign.findMany({ where: { status: "SCHEDULED", resendBroadcastId: { not: null } } });
  for (const c of scheduled) {
    if (c.scheduledAt && c.scheduledAt.getTime() > Date.now()) continue;
    try {
      const b = await getBroadcastStatus(c.resendBroadcastId!);
      if (b?.status === "sent") {
        await prisma.marketingCampaign.update({
          where: { id: c.id },
          data: { status: "SENT", sentAt: b.sent_at ? new Date(b.sent_at) : c.scheduledAt },
        });
      }
    } catch (err) {
      console.error("[marketing] aggiornamento stato campagna fallito:", err);
    }
  }
}

/** Allinea su Resend i contatti non ancora sincronizzati, a blocchi per non superare i limiti. */
export async function syncMarketingContactsAction(): Promise<Result & { synced?: number; remaining?: number; failed?: number }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (!isMarketingConfigured()) return { ok: false, error: "RESEND_API_KEY non configurata." };

  const { emails, total } = await pendingSyncEmails(60);
  let synced = 0;
  let failed = 0;
  let lastError = "";
  for (const email of emails) {
    try {
      await syncContact(email);
      synced += 1;
    } catch (err) {
      failed += 1;
      lastError = errorMessage(err);
    }
  }
  revalidateCampaign();
  return {
    ok: failed === 0,
    synced,
    failed,
    remaining: Math.max(0, total - synced),
    error: failed ? `${failed} contatti non sincronizzati. Ultimo errore: ${lastError}` : undefined,
  };
}
