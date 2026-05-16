import { z } from "zod"
import { protectedProcedure, router } from "../init"

export const contactsRouter = router({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        lastCampaignSent: { select: { name: true, color: true } },
      },
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

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.contact.deleteMany({
        where: { id: { in: input.ids } },
      })
    }),

  importExcel: protectedProcedure
    .input(
      z.object({
        contacts: z.array(
          z.object({
            firstName: z.string().min(1),
            lastName: z.string().optional().default(""),
            email: z.string().min(1, "Email is required"),
            phone: z.string().optional().default(""),
          }),
        ),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.contact.createMany({
        data: input.contacts.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone || null,
        })),
        skipDuplicates: true,
      })
    }),
})
