-- AlterTable
ALTER TABLE "send_job" ADD COLUMN "skipAlreadySent" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "email_send" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignName" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "messageId" TEXT,
    "sendJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_send_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_send_contactId_createdAt_idx" ON "email_send"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "email_send_campaignId_status_idx" ON "email_send"("campaignId", "status");

-- CreateIndex
CREATE INDEX "email_send_messageId_idx" ON "email_send"("messageId");

-- AddForeignKey
ALTER TABLE "email_send" ADD CONSTRAINT "email_send_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_send" ADD CONSTRAINT "email_send_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: before this table only each contact's last campaign was stored.
-- Keep that as one history row (time = the contact's last update).
INSERT INTO "email_send" ("id", "contactId", "campaignId", "campaignName", "domain", "status", "createdAt")
SELECT gen_random_uuid()::text, c."id", c."lastCampaignSentId", cp."name", COALESCE(m."domain", ''), 'sent', c."updatedAt"
FROM "contact" c
JOIN "campaign" cp ON cp."id" = c."lastCampaignSentId"
LEFT JOIN "mailgun_account" m ON m."id" = cp."mailgunAccountId";
