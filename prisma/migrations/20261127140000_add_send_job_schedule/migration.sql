-- AlterTable
ALTER TABLE "send_job" ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "send_job_status_scheduledAt_idx" ON "send_job"("status", "scheduledAt");
