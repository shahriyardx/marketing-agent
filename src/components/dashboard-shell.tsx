"use client"

import { AppRail } from "@/components/app-rail"
import { BackgroundJobs } from "@/components/background-jobs"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <AppRail />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <BackgroundJobs />
    </div>
  )
}
