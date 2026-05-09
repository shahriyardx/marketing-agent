import { z } from "zod"
import { protectedProcedure, router } from "../init"

export const contactsRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.contact.findUnique({
        where: { id: input.id },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.contact.update({
        where: { id: input.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone ?? null,
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.contact.delete({
        where: { id: input.id },
      })
    }),
})
