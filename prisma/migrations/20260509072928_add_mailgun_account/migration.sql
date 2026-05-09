-- CreateTable
CREATE TABLE "mailgun_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailgun_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailgun_account_userId_idx" ON "mailgun_account"("userId");

-- AddForeignKey
ALTER TABLE "mailgun_account" ADD CONSTRAINT "mailgun_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
