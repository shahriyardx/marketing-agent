import { z } from "zod"
import { protectedProcedure, router } from "../init"

// A running job that hasn't written progress in this long was killed
// (e.g. the server restarted mid-import).
const STALE_MS = 2 * 60 * 1000

export const importsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await ctx.prisma.importJob.updateMany({
      where: {
        status: { in: ["pending", "running"] },
        updatedAt: { lt: new Date(Date.now() - STALE_MS) },
        // an upload still streaming in can sit "pending" with no writes
        bytesTotal: { gt: 0 },
      },
      data: {
        status: "failed",
        error: "Interrupted (server restarted)",
        finishedAt: new Date(),
      },
    })

    return ctx.prisma.importJob.findMany({
      where: { dismissed: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
  }),

  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.importJob.update({
        where: { id: input.id },
        data: { dismissed: true },
      }),
    ),
})
