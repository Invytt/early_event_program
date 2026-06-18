"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  PlusIcon,
  CalendarIcon,
  MapPinIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Donut, Bars } from "@/components/charts"
import { RsvpChart } from "@/components/rsvp-chart"
import {
  events,
  eventCounts,
  allActivity,
  daysUntil,
  formatTime,
} from "@/lib/events"

const TODAY = new Date().toISOString().slice(0, 10)

const actionText: Record<string, string> = {
  going: "is going to",
  pending: "requested approval for",
  declined: "declined",
}
const actionDot: Record<string, string> = {
  going: "bg-green-500",
  pending: "bg-amber-500",
  declined: "bg-rose-500",
}

export default function DashboardPage() {
  const counts = events.map((e) => ({ e, c: eventCounts(e) }))
  const totalGoing = counts.reduce((s, x) => s + x.c.going, 0)
  const totalPending = counts.reduce((s, x) => s + x.c.pending, 0)
  const totalDeclined = counts.reduce((s, x) => s + x.c.declined, 0)
  const totalInvited = counts.reduce((s, x) => s + x.c.invited, 0)
  const rsvpRate = totalInvited ? Math.round((totalGoing / totalInvited) * 100) : 0
  const newThisWeek = Math.round(totalGoing * 0.18)

  const upcoming = counts
    .map((x) => ({ ...x, days: daysUntil(x.e.date, TODAY) }))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days)
  const upcomingCount = upcoming.length
  const next = upcoming[0]

  // total RSVPs over time (elementwise sum of per-event series)
  const steps = [0.05, 0.12, 0.22, 0.35, 0.5, 0.68, 0.85, 1]
  const totalSeries = steps.map((s) => Math.round(totalGoing * s))

  const byEvent = counts.map((x) => ({ label: x.e.name, value: x.c.going }))

  const attention = counts
    .map((x) => {
      const reasons: string[] = []
      if (x.c.pending > 0) reasons.push(`${x.c.pending} awaiting approval`)
      if (x.c.pct >= 90) reasons.push(`${x.c.pct}% capacity`)
      if (x.c.rsvpRate < 40) reasons.push(`low RSVP (${x.c.rsvpRate}%)`)
      return { e: x.e, reasons }
    })
    .filter((x) => x.reasons.length > 0)

  const activity = allActivity(8)
  const today = counts.filter((x) => daysUntil(x.e.date, TODAY) === 0)

  return (
    <>
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview across all your events.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/create-invite">
            <PlusIcon className="size-4" />
            Create invite
          </Link>
        </Button>
      </header>

      {today.length > 0 && (
        <div className="rounded-xl border border-green-600/30 bg-green-500/10 px-5 py-3 text-sm font-medium text-green-800">
          Happening today: {today.map((x) => x.e.name).join(", ")}
        </div>
      )}

      {/* Global stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total going" value={totalGoing} sub="across all events" />
        <Stat label="Pending approvals" value={totalPending} sub="needs review" />
        <Stat label="Upcoming events" value={upcomingCount} sub="scheduled ahead" />
        <Stat label="RSVP rate" value={`${rsvpRate}%`} sub="going ÷ invited" />
        <Stat label="New this week" value={newThisWeek} sub="recent RSVPs" />
        <Stat label="Declined" value={totalDeclined} sub="can't make it" />
      </div>

      {/* Next upcoming + breakdown */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {next && (
          <Link
            href={`/dashboard/events/${next.e.id}`}
            className="group xl:col-span-2"
          >
            <div className="flex h-full overflow-hidden rounded-xl border border-border bg-[var(--paper-2)] transition-shadow group-hover:shadow-md">
              <div className={`w-36 shrink-0 bg-gradient-to-br ${next.e.cover}`} />
              <div className="flex flex-1 flex-col gap-2 p-5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Next up · in {next.days} day{next.days === 1 ? "" : "s"}
                </span>
                <span className="text-lg font-semibold">{next.e.name}</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarIcon className="size-4" />
                  {format(new Date(next.e.date), "EEE, MMM d")} · {formatTime(next.e.time)}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPinIcon className="size-4" />
                  {next.e.location}
                </span>
                <span className="mt-auto text-sm font-medium">
                  {next.c.going} going · {next.c.pending} pending
                </span>
              </div>
            </div>
          </Link>
        )}
        <div className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
          <h2 className="mb-4 font-semibold">RSVP breakdown</h2>
          <Donut
            centerLabel={String(totalInvited)}
            centerSub="invited"
            segments={[
              { label: "Going", value: totalGoing, color: "oklch(0.7 0.15 150)" },
              { label: "Pending", value: totalPending, color: "oklch(0.75 0.15 80)" },
              { label: "Declined", value: totalDeclined, color: "oklch(0.65 0.2 20)" },
            ]}
          />
        </div>
      </div>

      {/* RSVPs over time */}
      <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
        <div className="mb-4">
          <h2 className="font-semibold">RSVPs over time</h2>
          <p className="text-sm text-muted-foreground">Total going across all events</p>
        </div>
        <RsvpChart series={totalSeries} />
      </section>

      {/* Guests by event + Needs attention */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
          <h2 className="mb-4 font-semibold">Guests by event</h2>
          <Bars data={byEvent} />
        </section>
        <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
          <h2 className="mb-4 font-semibold">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">All events look healthy.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {attention.map((a) => (
                <li key={a.e.id}>
                  <Link
                    href={`/dashboard/events/${a.e.id}`}
                    className="flex items-center gap-3 py-2.5 text-sm hover:text-foreground"
                  >
                    <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" />
                    <span className="flex flex-col">
                      <span className="font-medium">{a.e.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.reasons.join(" · ")}
                      </span>
                    </span>
                    <ArrowRightIcon className="ml-auto size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent activity */}
      <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
        <h2 className="mb-4 font-semibold">Recent activity</h2>
        <ul className="flex flex-col divide-y divide-border">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`size-2 shrink-0 rounded-full ${actionDot[a.action]}`} />
              <span>
                <span className="font-medium">{a.guest}</span>{" "}
                <span className="text-muted-foreground">{actionText[a.action]}</span>{" "}
                <span className="font-medium">{a.event}</span>
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{a.when}</span>
            </li>
          ))}
        </ul>
      </section>

    </>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: number | string
  sub: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-[var(--paper-2)] p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}
