/*
  Warnings:

  - You are about to drop the column `revokedAt` on the `api_key` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "api_key" DROP COLUMN "revokedAt";
