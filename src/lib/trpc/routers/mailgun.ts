import { z } from "zod"
import { protectedProcedure, router } from "../init"

function maskKey(key: string) {
  if (key.length <= 4) return "****"
  const visible = key.slice(-4)
  return `${"*".repeat(key.length - 4)}${visible}`
}

export const mailgunRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.prisma.mailgunAccount.findMany({
      orderBy: { createdAt: "desc" },
    })

    return accounts.map((a) => ({
      ...a,
      apiKey: maskKey(a.apiKey),
    }))
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
    .mutation(({ ctx, input }) => {
      return ctx.prisma.mailgunAccount.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        apiKey: z.string().optional(),
        domain: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.mailgunAccount.update({
        where: { id: input.id },
        data: {
          name: input.name,
          domain: input.domain,
          ...(input.apiKey ? { apiKey: input.apiKey } : {}),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.mailgunAccount.delete({
        where: { id: input.id },
      })
    }),
})
