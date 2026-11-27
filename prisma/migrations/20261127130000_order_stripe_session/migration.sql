-- Sessione Stripe dell'ordine: permette di verificare il pagamento anche senza webhook.
ALTER TABLE "Order" ADD COLUMN "stripeSessionId" TEXT;
