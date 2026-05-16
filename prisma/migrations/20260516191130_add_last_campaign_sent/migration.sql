-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "lastCampaignSentId" TEXT;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_lastCampaignSentId_fkey" FOREIGN KEY ("lastCampaignSentId") REFERENCES "campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
