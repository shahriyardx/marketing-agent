import { z } from "zod"
import { protectedProcedure, router } from "../init"

export const templatesRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.emailTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.emailTemplate.findUnique({
        where: { id: input.id },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        html: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.emailTemplate.create({
        data: input,
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        subject: z.string().min(1),
        html: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.emailTemplate.update({
        where: { id: input.id },
        data: {
          name: input.name,
          subject: input.subject,
          html: input.html,
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First set null on linked campaigns and disable them
      await ctx.prisma.campaign.updateMany({
        where: { templateId: input.id },
        data: { templateId: null, enabled: false },
      })

      return ctx.prisma.emailTemplate.delete({
        where: { id: input.id },
      })
    }),
})
