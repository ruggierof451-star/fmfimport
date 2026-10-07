"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendContactReplyNotice } from "@/lib/email";

const contactSchema = z.object({
  email: z.string().email("Inserisci un'email valida."),
  orderNumber: z.string().optional(),
  message: z.string().min(10, "Scrivi qualche dettaglio in più (almeno 10 caratteri)."),
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Salva il messaggio nel database (compare subito in /admin/messaggi) e invia una
 * conferma di ricezione via email al cliente.
 */
export async function submitContactMessageAction(input: ContactInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const data = parsed.data;

  await prisma.contactMessage.create({
    data: {
      email: data.email,
      orderNumber: data.orderNumber?.trim() || null,
      message: data.message,
    },
  });

  sendContactReplyNotice(data.email).catch((err) => console.error("[contatti] invio conferma fallito:", err));

  return { ok: true };
}
