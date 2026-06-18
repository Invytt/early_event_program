"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const config = {
  rsvps: { label: "RSVPs", color: "var(--chart-3)" },
} satisfies ChartConfig

export type SeriesPoint = { label: string; value: number }

export function RsvpChart({ series }: { series: SeriesPoint[] }) {
  const data = series.map((p) => ({ label: p.label, rsvps: p.value }))
  // thin x-axis ticks when there are many days
  const interval = data.length > 14 ? Math.ceil(data.length / 8) - 1 : 0

  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full">
      <LineChart data={data} margin={{ left: 12, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={interval}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Line
          dataKey="rsvps"
          type="monotone"
          stroke="var(--color-rsvps)"
          strokeWidth={2}
          dot={data.length <= 14 ? { r: 3 } : false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
