import Stripe from "stripe";

let client: Stripe | null = null;

/** Client Stripe, istanziato solo al primo utilizzo (serve solo lato server, al checkout). */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY non configurata.");
    client = new Stripe(key);
  }
  return client;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
