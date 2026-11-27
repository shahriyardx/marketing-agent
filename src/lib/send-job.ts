import { alreadySent, buildContactWhere, SENDABLE } from "@/lib/contact-filter"
import { sendMailgunEmail } from "@/lib/mailgun-send"
import { syncSuppressions } from "@/lib/mailgun-suppressions"
import { prisma } from "@/lib/prisma"

const PAGE = 500
const GROUP = 8 // concurrent Mailgun requests
const MAX_ERRORS_KEPT = 100
// If this many sends in a row-from-the-start all fail, the config is broken
// (bad key/domain): stop instead of failing the whole list.
const ABORT_AFTER_FAILURES = 20

type Failure = { email: string; error: string }

type Recipients = {
  campaignId: string
  contactIds: string[]
  search: string | null
  campaignFilter: string | null
  listId: string | null
  skipAlreadySent: boolean
}

/** A problem the user can fix; its message is shown as is. */
export class SendError extends Error {}

/**
 * Checks the campaign can send at `at`, refreshes the Mailgun block lists and
 * counts who will get it. Used by "send now" and by the scheduler at run time.
 */
export async function prepareSend(r: Recipients, at = new Date()) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: r.campaignId },
    include: { mailgunAccount: true, template: true },
  })
  if (!campaign) throw new SendError("Campaign not found")
  if (!campaign.template) throw new SendError("Campaign has no template")
  if (!campaign.mailgunAccount)
    throw new SendError("Campaign has no Mailgun account")
  if (!campaign.mailgunAccount.enabled)
    throw new SendError("Mailgun account is disabled")
  if (campaign.rateLimitedUntil && campaign.rateLimitedUntil > at)
    throw new SendError(
      `Campaign is rate limited until ${campaign.rateLimitedUntil.toISOString()}. Try again later.`,
    )

  // Pull every domain's unsubscribe, bounce and spam-complaint lists first so
  // nobody blocked anywhere gets this send. If a list can't be read, don't guess.
  const sync = await syncSuppressions()
  if (sync.errors.length > 0)
    throw new SendError(
      `Could not read Mailgun block lists (${sync.errors.join("; ")}). Fix or disable that Mailgun account, then try again.`,
    )

  const skip = r.skipAlreadySent ? [{ NOT: alreadySent(r.campaignId) }] : []
  const total = await prisma.contact.count({
    where: {
      AND: [
        r.contactIds.length
          ? { id: { in: r.contactIds } }
          : buildContactWhere(
              r.search ?? "",
              r.campaignFilter ?? "all",
              r.listId,
            ),
        SENDABLE,
        ...skip,
      ],
    },
  })
  if (total === 0)
    throw new SendError(
      r.skipAlreadySent
        ? "No contacts to send to: everyone left already got this campaign or is blocked"
        : "No contacts to send to: all are blocked (unsubscribed, bounced or spam)",
    )

  return { campaign, total }
}

async function* contactPages(job: Recipients) {
  const skip = job.skipAlreadySent ? [{ NOT: alreadySent(job.campaignId) }] : []

  if (job.contactIds.length > 0) {
    for (let i = 0; i < job.contactIds.length; i += PAGE) {
      yield await prisma.contact.findMany({
        where: {
          AND: [
            { id: { in: job.contactIds.slice(i, i + PAGE) } },
            SENDABLE,
            ...skip,
          ],
        },
        orderBy: { id: "asc" },
      })
    }
    return
  }

  const where = {
    AND: [
      buildContactWhere(
        job.search ?? "",
        job.campaignFilter ?? "all",
        job.listId,
      ),
      SENDABLE,
      ...skip,
    ],
  }
  let cursor: string | undefined
  while (true) {
    const rows = await prisma.contact.findMany({
      where: cursor ? { AND: [where, { id: { gt: cursor } }] } : where,
      orderBy: { id: "asc" },
      take: PAGE,
    })
    if (rows.length === 0) return
    yield rows
    cursor = rows[rows.length - 1].id
  }
}

export async function runSendJob(jobId: string) {
  let sent = 0
  let failed = 0
  const errors: Failure[] = []

  const finish = (
    status: "done" | "failed" | "cancelled" | "rate_limited",
    error?: string,
  ) =>
    prisma.sendJob
      .update({
        where: { id: jobId },
        data: {
          status,
          error: error ?? null,
          sent,
          failed,
          errors,
          finishedAt: new Date(),
        },
      })
      .catch(() => {})

  try {
    const job = await prisma.sendJob.findUniqueOrThrow({ where: { id: jobId } })
    const campaign = await prisma.campaign.findUnique({
      where: { id: job.campaignId },
      include: { mailgunAccount: true, template: true },
    })
    if (!campaign?.template || !campaign.mailgunAccount) {
      return finish("failed", "Campaign, template or Mailgun account is gone")
    }
    const { mailgunAccount, template } = campaign

    for await (const page of contactPages(job)) {
      for (let i = 0; i < page.length; i += GROUP) {
        const group = page.slice(i, i + GROUP)
        const results = await Promise.all(
          group.map((contact) =>
            sendMailgunEmail({
              campaign: {
                id: campaign.id,
                name: campaign.name,
                template,
                mailgunAccount,
              },
              contact,
            }).catch(
              (e): Awaited<ReturnType<typeof sendMailgunEmail>> => ({
                sent: false,
                status: 0,
                body: e instanceof Error ? e.message : "Network error",
              }),
            ),
          ),
        )

        const sentIds: string[] = []
        let rateLimit: number | null = null
        results.forEach((r, idx) => {
          if (r.sent) {
            sentIds.push(group[idx].id)
            return
          }
          failed++
          if (errors.length < MAX_ERRORS_KEPT)
            errors.push({ email: group[idx].email, error: r.body })
          if (r.status === 429)
            rateLimit = Math.max(rateLimit ?? 0, r.retryAfter ?? 3600)
        })
        sent += sentIds.length

        await prisma.emailSend.createMany({
          data: results.map((r, idx) => ({
            contactId: group[idx].id,
            campaignId: campaign.id,
            campaignName: campaign.name,
            domain: mailgunAccount.domain,
            status: r.sent ? "sent" : "failed",
            error: r.sent ? null : r.body,
            messageId: r.sent ? r.messageId : null,
            sendJobId: jobId,
          })),
        })

        if (sentIds.length > 0) {
          await prisma.contact.updateMany({
            where: { id: { in: sentIds } },
            data: { lastCampaignSentId: campaign.id },
          })
          await prisma.mailgunAccount.update({
            where: { id: mailgunAccount.id },
            data: { sentCount: { increment: sentIds.length } },
          })
        }

        if (rateLimit !== null) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { rateLimitedUntil: new Date(Date.now() + rateLimit * 1000) },
          })
          return finish(
            "rate_limited",
            `Mailgun rate limit hit; retry after ${Math.ceil(rateLimit / 60)} min`,
          )
        }
        if (sent === 0 && failed >= ABORT_AFTER_FAILURES) {
          return finish("failed", `Every send is failing: ${errors[0]?.error}`)
        }

        const row = await prisma.sendJob.update({
          where: { id: jobId },
          data: { sent, failed, errors },
          select: { status: true },
        })
        if (row.status === "cancelled") return
      }
    }

    return finish("done")
  } catch (e) {
    return finish("failed", e instanceof Error ? e.message : "Send failed")
  }
}
