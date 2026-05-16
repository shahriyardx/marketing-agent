import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { MegaphoneIcon, UsersIcon, FileTextIcon, MailIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ContactChart } from "./contact-charts"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
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

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
  const startOf7Days = new Date(startOfToday.getTime() - 7 * 86400000)
  const startOf30Days = new Date(startOfToday.getTime() - 30 * 86400000)
  const startOf12Months = new Date(now.getFullYear() - 1, now.getMonth(), 1)

  const [
    campaignCount,
    contactCount,
    templateCount,
    mailgunCount,
    recentContacts,
    recentCampaigns,
    contactsToday,
    contacts7Days,
    contacts30Days,
    contacts12Months,
  ] = await Promise.all([
    prisma.campaign.count(),
    prisma.contact.count(),
    prisma.emailTemplate.count(),
    prisma.mailgunAccount.count({ where: { enabled: true } }),
    prisma.contact.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        template: { select: { name: true } },
        mailgunAccount: { select: { name: true } },
      },
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

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome back{", "}
          {session?.user.name ?? session?.user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s an overview of your marketing platform.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContactChart
            todayData={todayData}
            day7Data={day7Data}
            day30Data={day30DataFiltered}
            monthData={monthData}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Campaigns
              </CardTitle>
              <MegaphoneIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {campaignCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Contacts
              </CardTitle>
              <UsersIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {contactCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Templates
              </CardTitle>
              <FileTextIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {templateCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Mailgun Accounts
              </CardTitle>
              <MailIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {mailgunCount}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentContacts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.firstName} {c.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Mailgun</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCampaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.template?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.mailgunAccount?.name ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
