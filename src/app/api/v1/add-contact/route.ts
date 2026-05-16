import { NextResponse } from "next/server"
import { z } from "zod"
import { validateApiRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { sendMailgunEmail } from "@/lib/mailgun-send"

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
})

const RR_KEY = "campaign_rr_index"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  const { valid, error } = await validateApiRequest(request)
  if (!valid) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json()
  const result = schema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  let contact: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    message: string | null
  }
  try {
    contact = await prisma.contact.create({
      data: result.data,
    })
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Contact with this email already exists" },
        { status: 409 },
      )
    }
    throw err
  }

  // Fire-and-forget campaign send — don't block contact creation
  sendCampaignToContact(contact).catch((e) =>
    console.error("add-contact campaign send failed:", e),
  )

  return NextResponse.json(contact)
}

async function sendCampaignToContact(contact: {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  message: string | null
}) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      enabled: true,
      templateId: { not: null },
      mailgunAccountId: { not: null },
      mailgunAccount: { enabled: true },
      OR: [
        { rateLimitedUntil: null },
        { rateLimitedUntil: { lte: new Date() } },
      ],
    },
    include: {
      template: true,
      mailgunAccount: true,
    },
    orderBy: { createdAt: "asc" },
  })

  if (campaigns.length === 0) return

  // Read round-robin index
  const rrSetting = await prisma.appSetting.findUnique({
    where: { key: RR_KEY },
  })
  let idx = rrSetting ? parseInt(rrSetting.value, 10) : 0
  if (Number.isNaN(idx) || idx < 0) idx = 0

  let delay = 1000
  let tried = 0

  while (tried < campaigns.length) {
    const campaign = campaigns[idx % campaigns.length]
    idx = (idx + 1) % campaigns.length
    tried++

    if (!campaign.template || !campaign.mailgunAccount) continue

    try {
      const result = await sendMailgunEmail({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          template: campaign.template,
          mailgunAccount: campaign.mailgunAccount,
        },
        contact,
      })

      if (result.sent) {
        await prisma.appSetting.upsert({
          where: { key: RR_KEY },
          create: { key: RR_KEY, value: String(idx) },
          update: { value: String(idx) },
        })

        await prisma.contact.update({
          where: { id: contact.id },
          data: { lastCampaignSentId: campaign.id },
        })

        return
      }

      if (result.status === 429) {
        const retryAfter = result.retryAfter ?? 3600
        const rateLimitedUntil = new Date(Date.now() + retryAfter * 1000)
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { rateLimitedUntil },
        })
        console.warn(
          `Campaign "${campaign.name}" rate limited until ${rateLimitedUntil.toISOString()}. Mailgun: ${result.body}`,
        )
      } else {
        console.warn(
          `Campaign "${campaign.name}" send failed (${result.status}): ${result.body}`,
        )
      }

      // Exponential backoff: 1s, 2s, 4s, 8s until max 30s
      if (tried < campaigns.length) {
        await sleep(delay)
        delay = Math.min(delay * 2, 30000)
      }
    } catch (e) {
      console.error(`Campaign "${campaign.name}" send error:`, e)
      await sleep(delay)
      delay = Math.min(delay * 2, 30000)
    }
  }

  // Round-robin index still advances so next contact doesn't retry disabled campaigns
  await prisma.appSetting
    .upsert({
      where: { key: RR_KEY },
      create: { key: RR_KEY, value: String(idx) },
      update: { value: String(idx) },
    })
    .catch(() => {})
}
