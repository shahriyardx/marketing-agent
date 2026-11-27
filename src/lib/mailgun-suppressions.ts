// Mailgun keeps three "do not send" lists per domain: unsubscribes (link
// clicked), bounces (address can't receive mail) and complaints (marked as
// spam). These helpers copy them onto Contact so the app can skip those people
// on every domain, not only the one where it happened.
import { prisma } from "@/lib/prisma"

type Account = { apiKey: string; domain: string }
type Item = { address: string; error?: string }

export const SUPPRESSION_LISTS = [
  "unsubscribes",
  "bounces",
  "complaints",
] as const
export type SuppressionList = (typeof SUPPRESSION_LISTS)[number]

const API = "https://api.mailgun.net/v3"
const CHUNK = 5000

function headers(apiKey: string) {
  return {
    Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
  }
}

/** Every entry on one domain's list (Mailgun pages 1000 at a time). */
async function fetchList(account: Account, list: SuppressionList) {
  const items: Item[] = []
  let url: string | undefined =
    `${API}/${encodeURIComponent(account.domain)}/${list}?limit=1000`
  while (url) {
    const res = await fetch(url, {
      headers: headers(account.apiKey),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      throw new Error(
        res.status === 401 || res.status === 403
          ? "API key can't read block lists. Use a full-access Mailgun API key, not a domain Sending key"
          : res.status === 404
            ? "domain not found (EU-region domains aren't supported)"
            : `Mailgun ${res.status} reading ${list}`,
      )
    }
    const body = (await res.json()) as {
      items: Item[]
      paging?: { next?: string }
    }
    if (body.items.length === 0) break
    items.push(...body.items)
    url = body.paging?.next === url ? undefined : body.paging?.next
  }
  return items
}

/** Marks contacts whose email is in `items`; returns how many were newly marked. */
async function mark(list: SuppressionList, items: Item[]) {
  let marked = 0
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK)
    const emails = chunk.map((it) => it.address.toLowerCase())
    if (list === "unsubscribes") {
      marked += await prisma.$executeRaw`
        UPDATE "contact" SET "unsubscribedAt" = now()
        WHERE "unsubscribedAt" IS NULL AND lower("email") = ANY(${emails})`
    } else if (list === "complaints") {
      marked += await prisma.$executeRaw`
        UPDATE "contact" SET "complainedAt" = now()
        WHERE "complainedAt" IS NULL AND lower("email") = ANY(${emails})`
    } else {
      const reasons = chunk.map((it) => it.error ?? "")
      marked += await prisma.$executeRaw`
        UPDATE "contact" AS c
        SET "bouncedAt" = now(), "bounceReason" = NULLIF(v.reason, '')
        FROM unnest(${emails}::text[], ${reasons}::text[]) AS v(email, reason)
        WHERE c."bouncedAt" IS NULL AND lower(c."email") = v.email`
    }
  }
  return marked
}

/**
 * Pulls all three lists from every enabled Mailgun account and marks matching
 * contacts. `errors` lists what could not be read.
 */
export async function syncSuppressions() {
  const accounts = await prisma.mailgunAccount.findMany({
    where: { enabled: true },
    select: { apiKey: true, domain: true },
  })
  const jobs = accounts.flatMap((a) =>
    SUPPRESSION_LISTS.map((list) => ({ a, list })),
  )
  const results = await Promise.allSettled(
    jobs.map(({ a, list }) => fetchList(a, list)),
  )

  const byList: Record<SuppressionList, Item[]> = {
    unsubscribes: [],
    bounces: [],
    complaints: [],
  }
  const errors: string[] = []
  results.forEach((r, i) => {
    const { a, list } = jobs[i]
    if (r.status === "fulfilled") byList[list].push(...r.value)
    else {
      const msg = `${a.domain}: ${String(r.reason?.message ?? r.reason)}`
      if (!errors.includes(msg)) errors.push(msg)
    }
  })

  const marked = {
    unsubscribed: await mark("unsubscribes", byList.unsubscribes),
    bounced: await mark("bounces", byList.bounces),
    complained: await mark("complaints", byList.complaints),
  }
  return { marked, errors }
}

/**
 * Checks one address on every enabled account's three lists (for single sends,
 * where a full sync would be too slow) and marks the contact. Lookup errors
 * count as "not listed" so a Mailgun hiccup does not block new leads; Mailgun
 * still refuses its own domain's listed addresses.
 */
export async function checkSuppressed(email: string) {
  const accounts = await prisma.mailgunAccount.findMany({
    where: { enabled: true },
    select: { apiKey: true, domain: true },
  })
  const lookups = accounts.flatMap((a) =>
    SUPPRESSION_LISTS.map(async (list) => {
      const res = await fetch(
        `${API}/${encodeURIComponent(a.domain)}/${list}/${encodeURIComponent(email)}`,
        { headers: headers(a.apiKey), signal: AbortSignal.timeout(10_000) },
      ).catch(() => null)
      if (!res?.ok) return null
      const item = (await res.json().catch(() => ({}))) as Partial<Item>
      return { list, item: { address: email, error: item.error } }
    }),
  )
  const hits = (await Promise.all(lookups)).filter((h) => h !== null)
  for (const { list, item } of hits) await mark(list, [item])
  return hits.length > 0
}

/** Whether Mailgun adds its unsubscribe link and one-click header for this domain. */
export async function getUnsubscribeTracking(account: Account) {
  const res = await fetch(
    `${API}/domains/${encodeURIComponent(account.domain)}/tracking`,
    { headers: headers(account.apiKey), signal: AbortSignal.timeout(10_000) },
  )
  if (!res.ok) throw new Error(`Mailgun ${res.status}`)
  const body = (await res.json()) as {
    tracking?: { unsubscribe?: { active?: boolean } }
  }
  return body.tracking?.unsubscribe?.active === true
}

export async function enableUnsubscribeTracking(account: Account) {
  const res = await fetch(
    `${API}/domains/${encodeURIComponent(account.domain)}/tracking/unsubscribe`,
    {
      method: "PUT",
      headers: headers(account.apiKey),
      body: new URLSearchParams({ active: "true" }),
      signal: AbortSignal.timeout(10_000),
    },
  )
  if (!res.ok) {
    throw new Error(
      `Mailgun ${res.status}: ${await res.text().catch(() => "")}`,
    )
  }
}
