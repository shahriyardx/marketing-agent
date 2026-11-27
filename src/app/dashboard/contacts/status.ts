type Blockable = {
  unsubscribedAt: Date | string | null
  bouncedAt: Date | string | null
  complainedAt: Date | string | null
}

/** One status per contact; the most serious block wins. */
export function contactStatus(c: Blockable) {
  if (c.complainedAt) return { label: "Spam", dot: "bg-destructive" }
  if (c.bouncedAt) return { label: "Bounced", dot: "bg-warning" }
  if (c.unsubscribedAt)
    return { label: "Unsubscribed", dot: "bg-muted-foreground" }
  return { label: "Subscribed", dot: "bg-success" }
}

const DAY = 86_400_000

/** "5m ago", "2h ago", "Yesterday", "3 days ago", then "Nov 18". */
export function timeAgo(value: Date | string) {
  const d = new Date(value)
  const diff = Date.now() - d.getTime()
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`
  if (diff < DAY) return `${Math.round(diff / 3_600_000)}h ago`
  if (diff < 2 * DAY) return "Yesterday"
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} days ago`
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" }
      : {}),
  })
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?"
}
