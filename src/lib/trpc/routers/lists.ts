import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { buildContactWhere } from "@/lib/contact-filter"
import { protectedProcedure, router } from "../init"

const PAGE = 5000

// Who to add: ticked contacts, or everyone matching the contacts page filter.
const target = z.union([
  z.object({ contactIds: z.array(z.string()).min(1).max(50000) }),
  z.object({
    filter: z.object({
      search: z.string(),
      campaignFilter: z.string(),
      listId: z.string().nullish(),
      status: z.string().nullish(),
    }),
  }),
])

export const listsRouter = router({
  getAll: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.contactList.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
  ),

  create: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.contactList.create({ data: { name: input.name } }),
    ),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.contactList.update({
        where: { id: input.id },
        data: { name: input.name },
      }),
    ),

  // Deletes the list only; the contacts stay.
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.contactList.delete({ where: { id: input.id } }),
    ),

  // Adds to an existing list, or to a new one when `newListName` is given.
  addContacts: protectedProcedure
    .input(
      z.object({
        listId: z.string().optional(),
        newListName: z.string().trim().min(1).optional(),
        target,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let listId = input.listId
      if (input.newListName) {
        listId = (
          await ctx.prisma.contactList.create({
            data: { name: input.newListName },
          })
        ).id
      }
      if (!listId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a list" })

      let added = 0
      const insert = async (contactIds: string[]) => {
        const { count } = await ctx.prisma.contactListMember.createMany({
          data: contactIds.map((contactId) => ({ listId, contactId })),
          skipDuplicates: true,
        })
        added += count
      }

      if ("contactIds" in input.target) {
        for (let i = 0; i < input.target.contactIds.length; i += PAGE)
          await insert(input.target.contactIds.slice(i, i + PAGE))
      } else {
        const {
          search,
          campaignFilter,
          listId: from,
          status,
        } = input.target.filter
        const where = buildContactWhere(search, campaignFilter, from, status)
        let cursor: string | undefined
        while (true) {
          const rows = await ctx.prisma.contact.findMany({
            where: cursor ? { AND: [where, { id: { gt: cursor } }] } : where,
            orderBy: { id: "asc" },
            take: PAGE,
            select: { id: true },
          })
          if (rows.length === 0) break
          await insert(rows.map((r) => r.id))
          cursor = rows[rows.length - 1].id
        }
      }

      return { listId, added }
    }),

  removeContacts: protectedProcedure
    .input(
      z.object({ listId: z.string(), contactIds: z.array(z.string()).min(1) }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.contactListMember.deleteMany({
        where: { listId: input.listId, contactId: { in: input.contactIds } },
      }),
    ),
})
