import { z } from "zod"
import { protectedProcedure, router } from "../init"

export const mailgunRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.mailgunAccount.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        apiKey: z.string().min(1),
        domain: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.mailgunAccount.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          apiKey: input.apiKey,
          domain: input.domain,
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
      const account = await ctx.prisma.mailgunAccount.findUnique({
        where: { id: input.id },
      })

      if (!account || account.userId !== ctx.session.user.id) {
        throw new Error("Not found")
      }

      return ctx.prisma.mailgunAccount.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.mailgunAccount.findUnique({
        where: { id: input.id },
      })

      if (!account || account.userId !== ctx.session.user.id) {
        throw new Error("Not found")
      }

      await ctx.prisma.mailgunAccount.delete({
        where: { id: input.id },
      })
    }),
})
