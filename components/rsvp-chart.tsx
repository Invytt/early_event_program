"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const LABELS = ["6w out", "5w out", "4w out", "3w out", "2w out", "1w out", "3d out", "Event"]

const config = {
  going: { label: "Going", color: "var(--chart-3)" },
} satisfies ChartConfig

export function RsvpChart({ series }: { series: number[] }) {
  const data = series.map((going, i) => ({
    label: LABELS[i] ?? `P${i + 1}`,
    going,
  }))

  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full">
      <LineChart data={data} margin={{ left: 12, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Line
          dataKey="going"
          type="monotone"
          stroke="var(--color-going)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
