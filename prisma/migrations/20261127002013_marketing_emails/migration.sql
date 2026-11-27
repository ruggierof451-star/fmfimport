-- Consenso esplicito alle email di marketing (default: no, finché l'utente non lo attiva).
ALTER TABLE "User" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;

-- Campagne email di marketing gestite dall'admin.
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');

CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientCount" INTEGER,
    "failedCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);
