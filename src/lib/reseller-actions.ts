"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendResellerRequestReceivedEmail, sendResellerRequestDecisionEmail, sendAdminNewResellerRequestNotification } from "@/lib/email";

const resellerRequestSchema = z.object({
  companyName: z.string().min(1, "Indica la ragione sociale."),
  vatNumber: z.string().min(5, "Indica una partita IVA valida."),
  sdiCode: z.string().optional(),
  contactName: z.string().min(1, "Indica un referente."),
  email: z.string().email("Inserisci un'email valida."),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export type ResellerRequestInput = z.infer<typeof resellerRequestSchema>;

/**
 * Richiesta pubblica dalla pagina "Lavora con noi". Non crea account né sconti: resta
 * in attesa di valutazione manuale da parte di un admin (vedi /admin/rivenditori).
 */
export async function submitResellerRequestAction(input: ResellerRequestInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = resellerRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const data = parsed.data;

  const companyName = data.companyName.trim();
  const email = data.email.trim();

  await prisma.resellerRequest.create({
    data: {
      companyName,
      vatNumber: data.vatNumber.trim(),
      sdiCode: data.sdiCode?.trim() || null,
      contactName: data.contactName.trim(),
      email,
      phone: data.phone?.trim() || null,
      message: data.message?.trim() || null,
    },
  });

  sendResellerRequestReceivedEmail(email, companyName).catch((err) =>
    console.error("[rivenditori] invio conferma ricezione fallito:", err)
  );
  sendAdminNewResellerRequestNotification({
    companyName,
    vatNumber: data.vatNumber.trim(),
    contactName: data.contactName.trim(),
    email,
  }).catch((err) => console.error("[rivenditori] invio notifica admin fallito:", err));

  return { ok: true };
}

/**
 * Approva o rifiuta una richiesta. Approvare NON è solo un'etichetta sulla richiesta:
 * collega l'account con quella email e gli dà il ruolo RESELLER (così compare tra i
 * rivenditori in Utenti e vede subito prezzi e scaglioni dedicati), copiando i dati
 * aziendali sul profilo. Se non esiste ancora un account con quella email la richiesta
 * resta approvata, ma viene detto chiaramente all'admin che il collegamento manca:
 * il cliente deve prima registrarsi, poi lo si collega da Utenti.
 * Rifiutare una richiesta già approvata revoca il ruolo, così i due stati non divergono.
 */
export async function reviewResellerRequestAction(input: {
  id: string;
  status: "APPROVED" | "REJECTED";
  note?: string;
}): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const previous = await prisma.resellerRequest.findUnique({ where: { id: input.id } });
  if (!previous) return { ok: false, error: "Richiesta non trovata." };

  const updated = await prisma.resellerRequest.update({
    where: { id: input.id },
    data: {
      status: input.status,
      note: input.note?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy: admin.email,
    },
  });

  const email = updated.email.toLowerCase().trim();
  const account = await prisma.user.findUnique({ where: { email } });
  let warning: string | undefined;

  if (input.status === "APPROVED") {
    if (!account) {
      warning = `Richiesta approvata, ma non esiste ancora un account con l'email ${email}: il cliente deve registrarsi sul sito, poi puoi collegarlo da Utenti → Rivenditori.`;
    } else if (account.role === "ADMIN") {
      warning = `Richiesta approvata. L'account ${email} è un admin: il ruolo non è stato cambiato (un admin vede già tutto).`;
    } else {
      await prisma.user.update({
        where: { id: account.id },
        data: {
          role: "RESELLER",
          companyName: account.companyName ?? updated.companyName,
          vatNumber: account.vatNumber ?? updated.vatNumber,
          sdiCode: account.sdiCode ?? updated.sdiCode,
        },
      });
    }
  } else if (previous.status === "APPROVED" && account?.role === "RESELLER") {
    await prisma.user.update({ where: { id: account.id }, data: { role: "CUSTOMER" } });
  }

  sendResellerRequestDecisionEmail({
    to: updated.email,
    companyName: updated.companyName,
    approved: input.status === "APPROVED",
    note: updated.note,
  }).catch((err) => console.error("[rivenditori] invio esito fallito:", err));

  revalidatePath("/admin/rivenditori");
  revalidatePath("/admin/utenti");
  return { ok: true, warning };
}
