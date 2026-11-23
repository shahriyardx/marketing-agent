import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { protectedProcedure, router } from "../init"

function maskKey(key: string) {
  if (key.length <= 4) return "****"
  const visible = key.slice(-4)
  return `${"*".repeat(key.length - 4)}${visible}`
}

async function assertKeyWorksForDomain(apiKey: string, domain: string) {
  const encoded = Buffer.from(`api:${apiKey}`).toString("base64")
  let res: Response
  try {
    res = await fetch(
      `https://api.mailgun.net/v3/domains/${encodeURIComponent(domain)}`,
      { headers: { Authorization: `Basic ${encoded}` } },
    )
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not reach Mailgun to verify the API key",
    })
  }

  if (res.ok) return

  const messages: Record<number, string> = {
    401: "Invalid Mailgun API key",
    403: `This API key doesn't have access to ${domain}`,
    404: `Domain ${domain} was not found for this API key (check the domain, and that the key is for the US region)`,
  }
  throw new TRPCError({
    code: res.status === 401 || res.status === 403 ? "UNAUTHORIZED" : "BAD_REQUEST",
    message: messages[res.status] ?? `Mailgun returned ${res.status} while verifying ${domain}`,
  })
}

export const mailgunRouter = router({
  validate: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const encoded = Buffer.from(`api:${input.apiKey}`).toString("base64")
      const res = await fetch("https://api.mailgun.net/v3/domains", {
        headers: { Authorization: `Basic ${encoded}` },
      })

      if (res.status === 401 || res.status === 403) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid Mailgun API key",
        })
      }

      if (!res.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate Mailgun API key",
        })
      }

      return { valid: true }
    }),

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
        fromEmail: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertKeyWorksForDomain(input.apiKey, input.domain)
      return ctx.prisma.mailgunAccount.create({
        data: {
          name: input.name,
          apiKey: input.apiKey,
          domain: input.domain,
          fromEmail: input.fromEmail ?? "noreply",
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
      const result = await ctx.prisma.mailgunAccount.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      })

      // When a mailgun account is disabled, auto-disable all linked campaigns
      if (!input.enabled) {
        await ctx.prisma.campaign.updateMany({
          where: { mailgunAccountId: input.id },
          data: { enabled: false },
        })
      }

      return result
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        apiKey: z.string().optional(),
        domain: z.string().min(1),
        fromEmail: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.mailgunAccount.findUnique({
        where: { id: input.id },
        select: { apiKey: true },
      })
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" })

      await assertKeyWorksForDomain(input.apiKey || existing.apiKey, input.domain)

      return ctx.prisma.mailgunAccount.update({
        where: { id: input.id },
        data: {
          name: input.name,
          domain: input.domain,
          ...(input.apiKey ? { apiKey: input.apiKey } : {}),
          ...(input.fromEmail !== undefined
            ? { fromEmail: input.fromEmail }
            : {}),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First set null on linked campaigns and disable them
      await ctx.prisma.campaign.updateMany({
        where: { mailgunAccountId: input.id },
        data: { mailgunAccountId: null, enabled: false },
      })

      return ctx.prisma.mailgunAccount.delete({
        where: { id: input.id },
      })
    }),
})
