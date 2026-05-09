import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  MegaphoneIcon,
  TrendingUpIcon,
  UsersIcon,
  TargetIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    label: "Active Campaigns",
    value: "12",
    icon: MegaphoneIcon,
    change: "+2 this week",
  },
  {
    label: "Total Reach",
    value: "48.2K",
    icon: UsersIcon,
    change: "+12% vs last month",
  },
  {
    label: "Engagement",
    value: "8.4%",
    icon: TrendingUpIcon,
    change: "+2.1% vs last month",
  },
  {
    label: "Conversions",
    value: "1,204",
    icon: TargetIcon,
    change: "+18% vs last month",
  },
]

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome back{", "}
          {session?.user.name ?? session?.user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your campaigns.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Campaign data will appear here once campaigns are created.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analytics charts will be displayed in this section.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
