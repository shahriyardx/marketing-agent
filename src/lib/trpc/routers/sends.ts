import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { prepareSend, runSendJob, SendError } from "@/lib/send-job"
import { protectedProcedure, router } from "../init"

// A running job that hasn't written progress in this long was killed
// (e.g. the server restarted mid-send).
const STALE_MS = 2 * 60 * 1000

export const sendsRouter = router({
  start: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        // Either explicit ids, or a filter meaning "everyone matching".
        contactIds: z.array(z.string()).max(50000).optional(),
        filter: z
          .object({
            search: z.string(),
            campaignFilter: z.string(),
            listId: z.string().nullish(),
          })
          .optional(),
        skipAlreadySent: z.boolean().default(true),
        // omitted => send now
        scheduledAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.contactIds?.length && !input.filter)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No contacts" })

      if (
        input.scheduledAt &&
        input.scheduledAt.getTime() < Date.now() - 60_000
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick a time in the future",
        })

      const recipients = {
        campaignId: input.campaignId,
        contactIds: input.contactIds ?? [],
        search: input.filter?.search ?? null,
        campaignFilter: input.filter?.campaignFilter ?? null,
        listId: input.filter?.listId ?? null,
        skipAlreadySent: input.skipAlreadySent,
      }
      // Checked now so mistakes show up straight away; a scheduled send is
      // checked again (and recounted) when it starts.
      let prepared: Awaited<ReturnType<typeof prepareSend>>
      try {
        prepared = await prepareSend(recipients, input.scheduledAt)
      } catch (e) {
        if (e instanceof SendError)
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message })
        throw e
      }
      const { campaign, total } = prepared

      const job = await ctx.prisma.sendJob.create({
        data: {
          ...recipients,
          campaignName: campaign.name,
          total,
          ...(input.scheduledAt
            ? { status: "scheduled", scheduledAt: input.scheduledAt }
            : {}),
        },
      })

      // Runs in the background; progress is polled via `list`. Scheduled
      // jobs are started by send-scheduler.ts.
      if (!input.scheduledAt) void runSendJob(job.id)
      return { jobId: job.id, total }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    await ctx.prisma.sendJob.updateMany({
      where: {
        status: "running",
        updatedAt: { lt: new Date(Date.now() - STALE_MS) },
      },
      data: {
        status: "failed",
        error: "Interrupted (server restarted)",
        finishedAt: new Date(),
      },
    })

    // contactIds can be huge; the UI doesn't need them
    const [scheduled, recent] = await Promise.all([
      ctx.prisma.sendJob.findMany({
        where: { status: "scheduled" },
        orderBy: { scheduledAt: "asc" },
        omit: { contactIds: true },
      }),
      ctx.prisma.sendJob.findMany({
        where: { dismissed: false, status: { not: "scheduled" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        omit: { contactIds: true },
      }),
    ])
    return [...scheduled, ...recent].map((j) => ({
      ...j,
      errors: (j.errors ?? []) as { email: string; error: string }[],
    }))
  }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.sendJob.updateMany({
        where: { id: input.id, status: { in: ["running", "scheduled"] } },
        data: { status: "cancelled", finishedAt: new Date() },
      }),
    ),

  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.sendJob.update({
        where: { id: input.id },
        data: { dismissed: true },
      }),
    ),
})
