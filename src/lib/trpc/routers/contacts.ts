import { z } from "zod"
import { buildContactWhere } from "@/lib/contact-filter"
import { protectedProcedure, router } from "../init"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const contactsRouter = router({
  // Paginated + filtered on the DB so the browser never holds the full list.
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(5000).default(50),
        search: z.string().default(""),
        // "all" | "none" (never sent) | campaign id
        campaignFilter: z.string().default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = buildContactWhere(input.search, input.campaignFilter)

      const [items, total] = await Promise.all([
        ctx.prisma.contact.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: input.page * input.pageSize,
          take: input.pageSize,
          include: {
            lastCampaignSent: { select: { name: true, color: true } },
          },
        }),
        ctx.prisma.contact.count({ where }),
      ])

      return { items, total }
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
        // The client sends large lists in batches of ~2000.
        contacts: z
          .array(
            z.object({
              firstName: z.string().min(1),
              lastName: z.string().optional().default(""),
              email: z.string().min(1, "Email is required"),
              phone: z.string().optional().default(""),
            }),
          )
          .max(3000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const byEmail = new Map<
        string,
        { firstName: string; lastName: string; email: string; phone: string | null }
      >()
      let invalid = 0
      for (const c of input.contacts) {
        const email = c.email.trim().toLowerCase()
        if (!EMAIL_RE.test(email)) {
          invalid++
          continue
        }
        if (byEmail.has(email)) continue
        byEmail.set(email, {
          firstName: c.firstName,
          lastName: c.lastName,
          email,
          phone: c.phone || null,
        })
      }

      const { count } = await ctx.prisma.contact.createMany({
        data: [...byEmail.values()],
        skipDuplicates: true,
      })

      return {
        created: count,
        invalid,
        duplicates: input.contacts.length - invalid - count,
      }
    }),
})
