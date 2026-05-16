-- AlterTable
ALTER TABLE "mailgun_account" ADD COLUMN     "fromEmail" TEXT NOT NULL DEFAULT 'noreply';
