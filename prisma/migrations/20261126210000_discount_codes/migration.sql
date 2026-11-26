-- Codici sconto applicabili a tutto il carrello (percentuale sul subtotale).
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOffBps" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;

-- Codice di lancio richiesto: 5% di sconto su tutto il carrello, nessuna scadenza,
-- nessun limite di utilizzi. L'admin può disattivarlo o crearne altri da /admin/sconti.
INSERT INTO "DiscountCode" ("id", "code", "percentOffBps", "active", "createdBy")
VALUES ('cm0discountfmfcards5pc0', 'FMFCARDS', 500, true, 'sistema (lancio)')
ON CONFLICT ("code") DO NOTHING;
