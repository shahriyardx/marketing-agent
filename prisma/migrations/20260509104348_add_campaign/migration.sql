-- CreateTable
CREATE TABLE "campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mailgunAccountId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_mailgunAccountId_fkey" FOREIGN KEY ("mailgunAccountId") REFERENCES "mailgun_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
