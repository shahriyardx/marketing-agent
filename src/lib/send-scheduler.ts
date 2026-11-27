import { prisma } from "@/lib/prisma"
import { prepareSend, runSendJob } from "@/lib/send-job"

const TICK_MS = 30_000

// Starts scheduled send jobs once they are due. Runs inside the app server
// (started from src/instrumentation.ts). A send due while the app was down
// starts as soon as it is back up.
export async function startDueSends() {
  const due = await prisma.sendJob.findMany({
    where: { status: "scheduled", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    select: { id: true },
  })

  for (const { id } of due) {
    // Claim it first so two app instances never both start it.
    const { count } = await prisma.sendJob.updateMany({
      where: { id, status: "scheduled" },
      data: { status: "running" },
    })
    if (count === 0) continue

    const job = await prisma.sendJob.findUniqueOrThrow({ where: { id } })
    try {
      // Re-check now: block lists, the campaign and the list may have changed.
      const { total } = await prepareSend(job)
      await prisma.sendJob.update({ where: { id }, data: { total } })
    } catch (e) {
      await prisma.sendJob.update({
        where: { id },
        data: {
          status: "failed",
          error: e instanceof Error ? e.message : "Could not start",
          finishedAt: new Date(),
        },
      })
      continue
    }
    void runSendJob(id)
  }
}

export function startSendScheduler() {
  // Dev hot-reload can load this module again; keep one timer per process.
  const g = globalThis as { __sendScheduler?: boolean }
  if (g.__sendScheduler) return
  g.__sendScheduler = true

  const run = () =>
    startDueSends().catch((e) => console.error("send scheduler:", e))
  void run()
  setInterval(run, TICK_MS)
}
