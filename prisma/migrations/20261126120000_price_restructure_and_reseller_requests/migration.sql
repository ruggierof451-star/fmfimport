-- Ristrutturazione prezzi: da calcolo automatico costo+margine a prezzo unico manuale
-- per prodotto, più listino dedicato (opzionale) per i rivenditori approvati.

-- 1) Nuove colonne prezzo manuale sul prodotto.
ALTER TABLE "Product" ADD COLUMN "priceCents" INTEGER;
ALTER TABLE "Product" ADD COLUMN "resellerPriceCents" INTEGER;

-- 2) Backfill: calcola il prezzo pubblico attuale (costo + margine + IVA, arrotondato a
--    ,90) con le regole vigenti in PricingSettings, cosi' i prezzi pubblicati non cambiano
--    nel momento in cui il motore di calcolo smette di essere usato.
WITH settings AS (
  SELECT "marginBps", "marginBulkBps", "bulkThresholdQty", "invoiceVatRateBps", "roundTo90Cents"
  FROM "PricingSettings" WHERE id = 1
),
computed AS (
  SELECT
    p.id,
    (
      CASE WHEN p."costVatTreatment" = 'GROSS_WITH_VAT'
        THEN ROUND((COALESCE(p."supplierCostCents", 0)::numeric * 10000) / (10000 + p."vatRateBps"))
        ELSE COALESCE(p."supplierCostCents", 0)::numeric
      END
    ) AS net_cost,
    s."marginBps" AS margin_bps,
    s."invoiceVatRateBps" AS vat_bps,
    s."roundTo90Cents" AS round90
  FROM "Product" p
  CROSS JOIN settings s
),
with_markup AS (
  SELECT
    id,
    ROUND(ROUND(net_cost * (10000 + margin_bps) / 10000) * (10000 + vat_bps) / 10000) AS raw_price,
    round90
  FROM computed
),
rounded AS (
  SELECT
    id,
    raw_price,
    (FLOOR(raw_price / 100.0) * 100 + 90) AS floor90,
    round90
  FROM with_markup
)
UPDATE "Product" p
SET "priceCents" = (
  CASE WHEN r.round90
    THEN (CASE WHEN r.floor90 >= r.raw_price THEN r.floor90 ELSE r.floor90 + 100 END)
    ELSE r.raw_price
  END
)::int
FROM rounded r
WHERE r.id = p.id;

-- 3) Le regole di margine/soglia quantità/arrotondamento non sono più usate: il prezzo
--    è manuale per prodotto. Resta solo l'IVA per la fattura e la spedizione.
ALTER TABLE "PricingSettings" DROP COLUMN "marginBps";
ALTER TABLE "PricingSettings" DROP COLUMN "marginBulkBps";
ALTER TABLE "PricingSettings" DROP COLUMN "bulkThresholdQty";
ALTER TABLE "PricingSettings" DROP COLUMN "roundTo90Cents";

-- 4) Richieste di accesso come rivenditore/distributore ("Lavora con noi").
CREATE TYPE "ResellerRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ResellerRequest" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "sdiCode" TEXT,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "status" "ResellerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "ResellerRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResellerRequest_status_idx" ON "ResellerRequest"("status");
