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

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const [
    campaignCount,
    contactCount,
    templateCount,
    mailgunCount,
    recentContacts,
    recentCampaigns,
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
  ])

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
