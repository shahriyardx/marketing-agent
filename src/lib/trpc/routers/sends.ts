import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { buildContactWhere } from "@/lib/contact-filter"
import { runSendJob } from "@/lib/send-job"
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
          .object({ search: z.string(), campaignFilter: z.string() })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.contactIds?.length && !input.filter)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No contacts" })

      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: input.campaignId },
        include: { mailgunAccount: true, template: true },
      })
      if (!campaign)
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" })
      if (!campaign.template)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign has no template",
        })
      if (!campaign.mailgunAccount)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign has no Mailgun account",
        })
      if (!campaign.mailgunAccount.enabled)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Mailgun account is disabled",
        })
      if (campaign.rateLimitedUntil && campaign.rateLimitedUntil > new Date())
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Campaign is rate limited until ${campaign.rateLimitedUntil.toISOString()}. Try again later.`,
        })

      const total = input.contactIds?.length
        ? await ctx.prisma.contact.count({
            where: { id: { in: input.contactIds } },
          })
        : await ctx.prisma.contact.count({
            where: buildContactWhere(
              input.filter?.search ?? "",
              input.filter?.campaignFilter ?? "all",
            ),
          })
      if (total === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "No contacts to send to" })

      const job = await ctx.prisma.sendJob.create({
        data: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          contactIds: input.contactIds ?? [],
          search: input.filter?.search ?? null,
          campaignFilter: input.filter?.campaignFilter ?? null,
          total,
        },
      })

      // Runs in the background; progress is polled via `list`.
      void runSendJob(job.id)
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

    const jobs = await ctx.prisma.sendJob.findMany({
      where: { dismissed: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      // contactIds can be huge; the UI doesn't need them
      omit: { contactIds: true },
    })
    return jobs.map((j) => ({
      ...j,
      errors: (j.errors ?? []) as { email: string; error: string }[],
    }))
  }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.sendJob.updateMany({
        where: { id: input.id, status: "running" },
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
