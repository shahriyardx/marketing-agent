-- AlterTable
ALTER TABLE "contact" ADD COLUMN "bouncedAt" TIMESTAMP(3),
ADD COLUMN "bounceReason" TEXT,
ADD COLUMN "complainedAt" TIMESTAMP(3);
