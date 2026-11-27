import { NextResponse } from "next/server";
import { Resend } from "resend";
import { revokeMarketingConsent } from "@/lib/marketing";

/**
 * Webhook di Resend: quando un contatto si disiscrive da un link Resend (o viene
 * eliminato da Resend), il consenso marketing viene tolto anche nel sito, così il
 * database resta la fonte di verità e nessuno viene ri-iscritto per errore.
 *
 * Configurazione su Resend → Webhooks: URL https://www.fmfcards.com/api/webhooks/resend,
 * eventi contact.updated e contact.deleted; il "signing secret" va in
 * RESEND_WEBHOOK_SECRET su Vercel.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook non configurato." }, { status: 503 });

  const payload = await req.text();
  let event;
  try {
    // la verifica della firma non usa la chiave API: basta un client qualsiasi
    event = new Resend(process.env.RESEND_API_KEY || "re_placeholder").webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? req.headers.get("webhook-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? req.headers.get("webhook-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? req.headers.get("webhook-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch {
    return NextResponse.json({ error: "Firma non valida." }, { status: 400 });
  }

  if ((event.type === "contact.updated" && event.data.unsubscribed) || event.type === "contact.deleted") {
    await revokeMarketingConsent(event.data.email);
  }
  return NextResponse.json({ received: true });
}
