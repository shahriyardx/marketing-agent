import { z } from "zod"
import { protectedProcedure, router } from "../init"

export const campaignsRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        mailgunAccount: { select: { id: true, name: true } },
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
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.create({
        data: input,
        include: {
          mailgunAccount: { select: { id: true, name: true } },
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
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: {
          name: input.name,
          mailgunAccountId: input.mailgunAccountId,
          templateId: input.templateId,
        },
        include: {
          mailgunAccount: { select: { id: true, name: true } },
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
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.campaign.delete({
        where: { id: input.id },
      })
    }),
})
