-- DropForeignKey
ALTER TABLE "campaign" DROP CONSTRAINT "campaign_mailgunAccountId_fkey";

-- DropForeignKey
ALTER TABLE "campaign" DROP CONSTRAINT "campaign_templateId_fkey";

-- AlterTable
ALTER TABLE "campaign" ALTER COLUMN "mailgunAccountId" DROP NOT NULL,
ALTER COLUMN "templateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_mailgunAccountId_fkey" FOREIGN KEY ("mailgunAccountId") REFERENCES "mailgun_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
