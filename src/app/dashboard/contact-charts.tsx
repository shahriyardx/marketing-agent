"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "12months", label: "Last 12 Months" },
] as const

type Period = (typeof PERIODS)[number]["value"]

const chartConfig = {
  contacts: {
    label: "Contacts",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ContactChart({
  todayData,
  day7Data,
  day30Data,
  monthData,
}: {
  todayData: { name: string; count: number }[]
  day7Data: { name: string; count: number }[]
  day30Data: { name: string; count: number }[]
  monthData: { name: string; count: number }[]
}) {
  const [period, setPeriod] = useState<Period>("today")

  const dataMap: Record<Period, { name: string; count: number }[]> = {
    today: todayData,
    "7days": day7Data,
    "30days": day30Data,
    "12months": monthData,
  }

  const data = dataMap[period]
  const hasData = data.some((d) => d.count > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-sm font-semibold">
          New contacts
        </CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="flex h-48 items-center justify-center text-muted-foreground">
            No new contacts in this period.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <BarChart data={data} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={24}
              />
              <ChartTooltip
                cursor
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-contacts)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
