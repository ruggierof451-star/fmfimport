-- Email marketing gestito dal sito (coda, statistiche, automazioni) al posto dei
-- Broadcast di Resend. Le colonne e la tabella rimosse sono state introdotte dalla
-- migrazione precedente e non contengono dati.
DROP TABLE "MarketingSegment";

DROP INDEX "MarketingCampaign_resendBroadcastId_key";
ALTER TABLE "MarketingCampaign" DROP COLUMN "resendBroadcastId";

ALTER TABLE "User" DROP COLUMN "marketingSyncedAt";

ALTER TABLE "NewsletterSubscriber" DROP COLUMN "marketingSyncedAt";
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "firstName" TEXT;
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'newsletter';

CREATE TYPE "MarketingSendStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "MarketingSend" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "campaignId" TEXT,
    "automationKey" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "refId" TEXT,
    "status" "MarketingSendStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "resendEmailId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickedAt" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "MarketingSend_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingSend_dedupeKey_key" ON "MarketingSend"("dedupeKey");
CREATE INDEX "MarketingSend_status_queuedAt_idx" ON "MarketingSend"("status", "queuedAt");
CREATE INDEX "MarketingSend_sentAt_idx" ON "MarketingSend"("sentAt");
CREATE INDEX "MarketingSend_campaignId_idx" ON "MarketingSend"("campaignId");
ALTER TABLE "MarketingSend" ADD CONSTRAINT "MarketingSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MarketingClick" (
    "id" TEXT NOT NULL,
    "sendId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingClick_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketingClick_sendId_idx" ON "MarketingClick"("sendId");
ALTER TABLE "MarketingClick" ADD CONSTRAINT "MarketingClick_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "MarketingSend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MarketingAutomation" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAutomation_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "MarketingEngineState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingEngineState_pkey" PRIMARY KEY ("id")
);
