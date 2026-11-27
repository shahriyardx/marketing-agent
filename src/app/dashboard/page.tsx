import { SENDABLE } from "@/lib/contact-filter"
import { prisma } from "@/lib/prisma"
import { cn } from "@/lib/utils"
import { PageBody, PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { timeAgo } from "./contacts/status"
import { ContactChart } from "./contact-charts"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Overview",
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const group = map.get(key)
    if (group) {
      group.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return map
}

function pad<N extends number>(n: N): `${N}` {
  return n.toString().padStart(2, "0") as unknown as `${N}`
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: "good" | "bad"
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl font-semibold tracking-tight">
        {value}
      </span>
      <span
        className={cn(
          "text-xs text-muted-foreground",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
        )}
      >
        {hint}
      </span>
    </div>
  )
}

function Panel({
  title,
  href,
  children,
}: {
  title: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-11 items-center border-b px-4">
        <h2 className="font-heading text-sm font-semibold">{title}</h2>
        {href && (
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <a href={href}>View all</a>
          </Button>
        )}
      </div>
      {children}
    </section>
  )
}

const fmt = (n: number) => n.toLocaleString()

export default async function DashboardPage() {
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
  const startOf7Days = new Date(startOfToday.getTime() - 7 * 86400000)
  const startOf30Days = new Date(startOfToday.getTime() - 30 * 86400000)
  const startOf12Months = new Date(now.getFullYear() - 1, now.getMonth(), 1)

  const since30 = new Date(Date.now() - 30 * 86400000)
  const since7 = new Date(Date.now() - 7 * 86400000)
  const [
    contactCount,
    sendableCount,
    newThisWeek,
    sent30,
    failed30,
    recentContacts,
    recentSends,
    scheduled,
    contactsToday,
    contacts7Days,
    contacts30Days,
    contacts12Months,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: SENDABLE }),
    prisma.contact.count({ where: { createdAt: { gte: since7 } } }),
    prisma.emailSend.count({
      where: { status: "sent", createdAt: { gte: since30 } },
    }),
    prisma.emailSend.count({
      where: { status: "failed", createdAt: { gte: since30 } },
    }),
    prisma.contact.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.emailSend.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        campaign: { select: { color: true } },
      },
    }),
    prisma.sendJob.findMany({
      where: { status: "scheduled" },
      orderBy: { scheduledAt: "asc" },
      take: 4,
      select: { id: true, campaignName: true, scheduledAt: true, total: true },
    }),
    prisma.contact.findMany({
      where: { createdAt: { gte: startOfToday } },
      select: { createdAt: true },
    }),
    prisma.contact.findMany({
      where: { createdAt: { gte: startOf7Days } },
      select: { createdAt: true },
    }),
    prisma.contact.findMany({
      where: { createdAt: { gte: startOf30Days } },
      select: { createdAt: true },
    }),
    prisma.contact.findMany({
      where: { createdAt: { gte: startOf12Months } },
      select: { createdAt: true },
    }),
  ])

  // Group by hour for today
  const todayGroups = groupBy(
    contactsToday,
    (c) => `${pad(c.createdAt.getHours())}:00`,
  )
  const todayData = Array.from({ length: 24 }, (_, i) => {
    const key = `${pad(i)}:00`
    return { name: key, count: todayGroups.get(key)?.length ?? 0 }
  })

  // Group by day for last 7 days
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const day7Groups = groupBy(contacts7Days, (c) => {
    const d = c.createdAt
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const day7Data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfToday.getTime() - (6 - i) * 86400000)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    return {
      name: `${dayNames[d.getDay()]}`,
      label: key,
      count: day7Groups.get(key)?.length ?? 0,
    }
  })

  // Group by day for last 30 days
  const day30Groups = groupBy(contacts30Days, (c) => {
    const d = c.createdAt
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  const day30Data = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(startOfToday.getTime() - (29 - i) * 86400000)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    return { name: key, count: day30Groups.get(key)?.length ?? 0 }
  })
  // Show every 5th label to avoid crowding
  const day30DataFiltered = day30Data.map((d, i) => ({
    ...d,
    name: i % 5 === 0 || i === day30Data.length - 1 ? d.name : "",
  }))

  // Group by month for last 12 months
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  const monthGroups = groupBy(contacts12Months, (c) => {
    const d = c.createdAt
    return `${d.getFullYear()}-${d.getMonth()}`
  })
  const monthData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear() - 1, now.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    return {
      name: monthNames[d.getMonth()],
      count: monthGroups.get(key)?.length ?? 0,
    }
  })

  const blocked = contactCount - sendableCount
  const sendablePct = contactCount
    ? Math.round((sendableCount / contactCount) * 1000) / 10
    : 0
  const failRate = sent30 + failed30 ? failed30 / (sent30 + failed30) : 0

  return (
    <>
      <PageHeader title="Overview">
        <Button variant="outline" asChild>
          <a href="/dashboard/contacts">Contacts</a>
        </Button>
        <Button variant="accent" asChild>
          <a href="/dashboard/contacts">Send a campaign</a>
        </Button>
      </PageHeader>
      <PageBody className="gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Contacts"
            value={fmt(contactCount)}
            hint={`+${fmt(newThisWeek)} in the last 7 days`}
            tone={newThisWeek > 0 ? "good" : undefined}
          />
          <Stat
            label="Can receive email"
            value={`${sendablePct}%`}
            hint={`${fmt(blocked)} unsubscribed, bounced or spam`}
          />
          <Stat
            label="Emails sent · 30 days"
            value={fmt(sent30)}
            hint={sent30 ? "Accepted by Mailgun" : "Nothing sent yet"}
          />
          <Stat
            label="Failed sends · 30 days"
            value={fmt(failed30)}
            hint={
              failed30
                ? `${(failRate * 100).toFixed(1)}% of attempts`
                : "No failures"
            }
            tone={failed30 ? "bad" : "good"}
          />
        </div>

        <ContactChart
          todayData={todayData}
          day7Data={day7Data}
          day30Data={day30DataFiltered}
          monthData={monthData}
        />

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Recent sends" href="/dashboard/contacts">
            {recentSends.length === 0 ? (
              <p className="px-4 py-6 text-muted-foreground">
                No emails sent yet.
              </p>
            ) : (
              <ol>
                {recentSends.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        s.status === "sent" ? "bg-success" : "bg-warning",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {s.contact.firstName} {s.contact.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.status === "sent" ? "" : "Failed · "}
                        {s.campaignName}
                      </p>
                    </div>
                    <time className="font-mono text-[11px] text-muted-foreground">
                      {timeAgo(s.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="New contacts" href="/dashboard/contacts">
            {recentContacts.length === 0 ? (
              <p className="px-4 py-6 text-muted-foreground">
                No contacts yet.
              </p>
            ) : (
              <ol>
                {recentContacts.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {c.email}
                      </p>
                    </div>
                    <time className="font-mono text-[11px] text-muted-foreground">
                      {timeAgo(c.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Scheduled">
            {scheduled.length === 0 ? (
              <p className="px-4 py-6 text-muted-foreground">
                Nothing scheduled. Schedule a send from Contacts.
              </p>
            ) : (
              <ol>
                {scheduled.map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{j.campaignName}</p>
                      <p className="text-xs text-muted-foreground">
                        About {fmt(j.total)} contacts
                      </p>
                    </div>
                    <time className="text-right font-mono text-[11px] text-muted-foreground">
                      {j.scheduledAt?.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  )
}
