import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/order-payment";

/**
 * Riceve gli eventi di pagamento da Stripe. La conferma vera e propria dell'ordine sta
 * in markOrderPaid (lib/order-payment.ts), condivisa con la verifica al ritorno del
 * cliente: così l'ordine si conferma da solo anche se il webhook non arriva, e in
 * nessun caso si confermano due volte. La firma della richiesta viene sempre verificata:
 * non ci si fida mai di un evento che non sia davvero di Stripe.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configurato." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook stripe] firma non valida:", err);
    return NextResponse.json({ error: "Firma non valida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as { metadata?: { orderId?: string } | null };
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      console.error("[webhook stripe] sessione senza orderId nei metadata.");
      return NextResponse.json({ received: true });
    }
    await markOrderPaid(orderId, "stripe");
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as { metadata?: { orderId?: string } | null };
    const orderId = session.metadata?.orderId;
    if (orderId) await markOrderPaymentFailed(orderId, "stripe");
  }

  return NextResponse.json({ received: true });
}
