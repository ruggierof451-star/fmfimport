-- Email marketing tramite Resend Broadcasts: newsletter con doppia conferma, segmenti,
-- campagne programmabili. Solo aggiunte: nessun dato esistente viene modificato.
ALTER TYPE "MarketingCampaignStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "MarketingCampaignStatus" ADD VALUE 'CANCELED';

ALTER TABLE "MarketingCampaign" ADD COLUMN "segmentKey" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "MarketingCampaign" ADD COLUMN "previewText" TEXT;
ALTER TABLE "MarketingCampaign" ADD COLUMN "scheduledAt" TIMESTAMP(3);
ALTER TABLE "MarketingCampaign" ADD COLUMN "resendBroadcastId" TEXT;
CREATE UNIQUE INDEX "MarketingCampaign_resendBroadcastId_key" ON "MarketingCampaign"("resendBroadcastId");

ALTER TABLE "User" ADD COLUMN "marketingSyncedAt" TIMESTAMP(3);

CREATE TYPE "NewsletterStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');

CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'PENDING',
    "interests" TEXT[],
    "confirmToken" TEXT NOT NULL,
    "confirmSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "marketingSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

CREATE TABLE "MarketingSegment" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resendSegmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingSegment_pkey" PRIMARY KEY ("key")
);
CREATE UNIQUE INDEX "MarketingSegment_resendSegmentId_key" ON "MarketingSegment"("resendSegmentId");
