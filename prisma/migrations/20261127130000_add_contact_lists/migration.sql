-- AlterTable
ALTER TABLE "send_job" ADD COLUMN "listId" TEXT;

-- CreateTable
CREATE TABLE "contact_list" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_list_member" (
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_list_member_pkey" PRIMARY KEY ("listId","contactId")
);

-- CreateIndex
CREATE INDEX "contact_list_member_contactId_idx" ON "contact_list_member"("contactId");

-- AddForeignKey
ALTER TABLE "contact_list_member" ADD CONSTRAINT "contact_list_member_listId_fkey" FOREIGN KEY ("listId") REFERENCES "contact_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_list_member" ADD CONSTRAINT "contact_list_member_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
