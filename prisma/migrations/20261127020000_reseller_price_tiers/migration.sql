-- Scaglioni di prezzo per quantità riservati ai rivenditori approvati (uguali per tutti).
CREATE TABLE "ResellerPriceTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerPriceTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResellerPriceTier_productId_minQty_key" ON "ResellerPriceTier"("productId", "minQty");

ALTER TABLE "ResellerPriceTier" ADD CONSTRAINT "ResellerPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
