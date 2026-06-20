"use client"

import dynamic from "next/dynamic"

export type SeriesPoint = { label: string; value: number }

// recharts is heavy (~100kb); load it only on the client, after first paint,
// so it stays out of the dashboard's initial JS bundle.
const RsvpChartImpl = dynamic(() => import("@/components/rsvp-chart-impl"), {
  ssr: false,
  loading: () => <div className="h-44 w-full animate-pulse rounded-md bg-black/5" />,
})

export function RsvpChart({ series }: { series: SeriesPoint[] }) {
  return <RsvpChartImpl series={series} />
}
