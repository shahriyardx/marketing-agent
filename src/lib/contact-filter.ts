// Contacts that may be emailed: not unsubscribed, bounced or complained.
export const SENDABLE = {
  unsubscribedAt: null,
  bouncedAt: null,
  complainedAt: null,
}

// Filters that list contacts Mailgun blocks; each can be deleted in bulk.
export const BLOCKED_FILTERS = {
  blocked: "Blocked (any reason)",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  complained: "Marked as spam",
} as const

const BLOCKED_WHERE = {
  blocked: {
    OR: [
      { unsubscribedAt: { not: null } },
      { bouncedAt: { not: null } },
      { complainedAt: { not: null } },
    ],
  },
  unsubscribed: { unsubscribedAt: { not: null } },
  bounced: { bouncedAt: { not: null } },
  complained: { complainedAt: { not: null } },
}

// Contacts who already got this campaign (for "skip already sent").
export const alreadySent = (campaignId: string) => ({
  sends: { some: { campaignId, status: "sent" } },
})

export const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "sendable", label: "Can receive" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Spam" },
] as const
export type ContactStatus = (typeof STATUS_TABS)[number]["value"]

function statusWhere(status: string | null | undefined) {
  if (status === "sendable") return SENDABLE
  if (status && status in BLOCKED_WHERE)
    return BLOCKED_WHERE[status as keyof typeof BLOCKED_WHERE]
  return {}
}

// Shared by the contacts list and bulk sends so "all matching" means the same.
// `campaignFilter`: "all" | "none" | "sent" | campaign id (older saved jobs may
// also hold a BLOCKED_FILTERS key). `status`: a STATUS_TABS value.
export function buildContactWhere(
  search: string,
  campaignFilter: string,
  listId?: string | null,
  status?: string | null,
) {
  const q = search.trim()
  const campaign =
    campaignFilter in BLOCKED_WHERE
      ? statusWhere(campaignFilter)
      : campaignFilter === "none"
        ? { sends: { none: { status: "sent" } } }
        : campaignFilter === "sent"
          ? { sends: { some: { status: "sent" } } }
          : campaignFilter !== "all"
            ? {
                sends: { some: { campaignId: campaignFilter, status: "sent" } },
              }
            : {}
  return {
    AND: [
      listId ? { lists: { some: { listId } } } : {},
      campaign,
      statusWhere(status),
      q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  }
}
