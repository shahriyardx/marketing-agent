/*
  Warnings:

  - You are about to drop the column `userId` on the `mailgun_account` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "mailgun_account" DROP CONSTRAINT "mailgun_account_userId_fkey";

-- DropIndex
DROP INDEX "mailgun_account_userId_idx";

-- AlterTable
ALTER TABLE "mailgun_account" DROP COLUMN "userId";
