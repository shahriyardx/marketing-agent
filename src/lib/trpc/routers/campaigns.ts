import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { sendMailgunEmail } from "@/lib/mailgun-send"
import { protectedProcedure, router } from "../init"

export const campaignsRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        mailgunAccount: { select: { id: true, name: true, enabled: true } },
        template: { select: { id: true, name: true } },
      },
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        mailgunAccountId: z.string().min(1),
        templateId: z.string().min(1),
        color: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.create({
        data: input,
        include: {
          mailgunAccount: { select: { id: true, name: true, enabled: true } },
          template: { select: { id: true, name: true } },
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        mailgunAccountId: z.string().min(1),
        templateId: z.string().min(1),
        color: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: {
          name: input.name,
          mailgunAccountId: input.mailgunAccountId,
          templateId: input.templateId,
          ...(input.color ? { color: input.color } : {}),
        },
        include: {
          mailgunAccount: { select: { id: true, name: true, enabled: true } },
          template: { select: { id: true, name: true } },
        },
      })
    }),

  toggle: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.enabled) {
        const campaign = await ctx.prisma.campaign.findUnique({
          where: { id: input.id },
          include: {
            mailgunAccount: { select: { enabled: true } },
          },
        })

        if (!campaign?.templateId) {
          throw new Error(
            "Cannot enable campaign: Template is missing",
          )
        }

        if (!campaign?.mailgunAccountId) {
          throw new Error(
            "Cannot enable campaign: Mailgun account is missing",
          )
        }

        if (!campaign.mailgunAccount?.enabled) {
          throw new Error(
            "Cannot enable campaign: Mailgun account is disabled",
          )
        }
      }

      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
        include: {
          mailgunAccount: { select: { id: true, name: true, enabled: true } },
          template: { select: { id: true, name: true } },
        },
      })
    }),

  send: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        contactId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [campaign, contact] = await Promise.all([
        ctx.prisma.campaign.findUnique({
          where: { id: input.campaignId },
          include: {
            mailgunAccount: true,
            template: true,
          },
        }),
        ctx.prisma.contact.findUnique({
          where: { id: input.contactId },
        }),
      ])

      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" })
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
      if (!campaign.template) throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign has no template" })
      if (!campaign.mailgunAccount) throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign has no Mailgun account" })
      if (!campaign.mailgunAccount.enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Mailgun account is disabled" })

      if (campaign.rateLimitedUntil && campaign.rateLimitedUntil > new Date()) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Campaign is rate limited until ${campaign.rateLimitedUntil.toISOString()}. Try again later.`,
        })
      }

      const result = await sendMailgunEmail({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          template: campaign.template,
          mailgunAccount: campaign.mailgunAccount,
        },
        contact,
      })

      if (!result.sent) {
        if (result.status === 429) {
          const retryAfter = result.retryAfter ?? 3600
          const rateLimitedUntil = new Date(Date.now() + retryAfter * 1000)
          await ctx.prisma.campaign.update({
            where: { id: campaign.id },
            data: { rateLimitedUntil },
          })
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Campaign rate limited until ${rateLimitedUntil.toISOString()}.`,
          })
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Mailgun send failed: ${result.body}`,
        })
      }

      await Promise.all([
        ctx.prisma.contact.update({
          where: { id: contact.id },
          data: { lastCampaignSentId: campaign.id },
        }),
        ctx.prisma.mailgunAccount.update({
          where: { id: campaign.mailgunAccountId! },
          data: { sentCount: { increment: 1 } },
        }),
      ])

      return { sent: true }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.delete({
        where: { id: input.id },
      })
    }),
})
