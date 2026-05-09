import { z } from "zod"
import { protectedProcedure, router } from "../init"
import { generateApiKey } from "../../api-key"

export const apiKeysRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { raw, prefix, hash } = generateApiKey()

      await ctx.prisma.apiKey.create({
        data: {
          name: input.name,
          prefix,
          hash,
        },
      })

      return { raw, prefix }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.apiKey.delete({
        where: { id: input.id },
      })
    }),
})
