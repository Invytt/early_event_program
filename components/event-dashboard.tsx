"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CheckIcon,
  XIcon,
  Share2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Donut } from "@/components/charts"
import { RsvpChart } from "@/components/rsvp-chart"
import type { EventInvite, Guest, GuestStatus, Activity } from "@/lib/events"

const PALETTE = [
  "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-emerald-500",
  "bg-sky-500", "bg-violet-500", "bg-teal-500",
]
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("")

function Avatar({ name, i }: { name: string; i: number }) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${PALETTE[i % PALETTE.length]}`}
    >
      {initials(name)}
    </span>
  )
}

const statusStyles: Record<GuestStatus, string> = {
  Going: "bg-green-500/15 text-green-700 border-green-600/30",
  Pending: "bg-amber-500/15 text-amber-700 border-amber-600/30",
  Declined: "bg-rose-500/15 text-rose-700 border-rose-600/30",
}

export function EventDashboard({
  event,
  initialGuests,
  capacity,
  series,
  dateLabel,
  timeLabel,
  daysAway,
  activity,
}: {
  event: EventInvite
  initialGuests: Guest[]
  capacity: number
  series: number[]
  dateLabel: string
  timeLabel: string
  daysAway: number
  activity: Activity[]
}) {
  const [guests, setGuests] = React.useState<Guest[]>(initialGuests)
  const [filter, setFilter] = React.useState<"All" | GuestStatus>("All")
  const [tab, setTab] = React.useState<"Overview" | "Approval queue" | "Guest list">("Overview")
  const [copied, setCopied] = React.useState(false)

  const going = guests.filter((g) => g.status === "Going").length
  const pending = guests.filter((g) => g.status === "Pending").length
  const declined = guests.filter((g) => g.status === "Declined").length
  const pct = Math.min(100, Math.round((going / capacity) * 100))

  function decide(id: number, status: GuestStatus) {
    setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, status } : g)))
  }

  const queue = guests.filter((g) => g.status === "Pending")
  const shown = filter === "All" ? guests : guests.filter((g) => g.status === filter)

  return (
    <>
      <Link
        href="/dashboard/my-invitations"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to your invitations
      </Link>

      {/* Header */}
      <div
        className={`relative flex min-h-40 flex-col justify-end gap-3 overflow-hidden rounded-xl bg-gradient-to-br ${event.cover} p-5 text-white`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
              {daysAway > 0 ? `In ${daysAway} day${daysAway === 1 ? "" : "s"}` : daysAway === 0 ? "Today" : "Past event"}
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{event.name}</h1>
            <p className="text-sm text-white/80">Hosted by {event.host}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/invites/${event.id}`
                )
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              <Share2Icon className="size-4" />
              {copied ? "Copied!" : "Share"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/90">
          <span className="flex items-center gap-1.5"><CalendarIcon className="size-4" />{dateLabel}</span>
          <span className="flex items-center gap-1.5"><ClockIcon className="size-4" />{timeLabel}</span>
          <span className="flex items-center gap-1.5"><MapPinIcon className="size-4" />{event.location}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["Overview", "Approval queue", "Guest list"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {t === "Approval queue" && pending > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-700">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "Overview" && (
      <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Going" value={going} sub={`of ${capacity} capacity`} />
        <Stat label="Pending approval" value={pending} sub={pending ? "needs review" : "all clear"} />
        <Stat label="Declined" value={declined} sub="can't make it" />
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-[var(--paper-2)] p-5">
          <span className="text-sm text-muted-foreground">Capacity used</span>
          <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
        <div className="mb-4">
          <h2 className="font-semibold">RSVPs over time</h2>
          <p className="text-sm text-muted-foreground">Cumulative going, since invites were sent</p>
        </div>
        <RsvpChart series={series} />
      </section>

      {/* Breakdown + activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
          <h2 className="mb-4 font-semibold">RSVP breakdown</h2>
          <Donut
            centerLabel={String(going + pending + declined)}
            centerSub="invited"
            segments={[
              { label: "Going", value: going, color: "oklch(0.7 0.15 150)" },
              { label: "Pending", value: pending, color: "oklch(0.75 0.15 80)" },
              { label: "Declined", value: declined, color: "oklch(0.65 0.2 20)" },
            ]}
          />
        </section>
        <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
          <h2 className="mb-4 font-semibold">Recent activity</h2>
          <ul className="flex flex-col divide-y divide-border">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    a.action === "going" ? "bg-green-500" : a.action === "pending" ? "bg-amber-500" : "bg-rose-500"
                  }`}
                />
                <span>
                  <span className="font-medium">{a.guest}</span>{" "}
                  <span className="text-muted-foreground">
                    {a.action === "going" ? "is going" : a.action === "pending" ? "requested approval" : "declined"}
                  </span>
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{a.when}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      </>
      )}

      {/* Approval queue */}
      {tab === "Approval queue" &&
        (event.requireApproval ? (
        <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
          <div className="mb-4">
            <h2 className="font-semibold">Approval queue</h2>
            <p className="text-sm text-muted-foreground">
              {queue.length ? `${queue.length} guest${queue.length > 1 ? "s" : ""} awaiting your approval` : "No pending requests"}
            </p>
          </div>
          {queue.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {queue.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={g.name} i={g.id} />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">Requested {g.when}</span>
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" className="gap-1" onClick={() => decide(g.id, "Going")}>
                      <CheckIcon className="size-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => decide(g.id, "Declined")}>
                      <XIcon className="size-4" /> Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        ) : (
          <section className="rounded-xl border border-border bg-[var(--paper-2)] p-8 text-center text-sm text-muted-foreground">
            Approval is not required for this event — guests are confirmed automatically.
          </section>
        ))}

      {/* Guest list */}
      {tab === "Guest list" && (
      <section className="rounded-xl border border-border bg-[var(--paper-2)] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Guest list</h2>
            <p className="text-sm text-muted-foreground">{guests.length} total</p>
          </div>
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {(["All", "Going", "Pending", "Declined"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {shown.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={g.name} i={g.id} />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.when}</span>
              </span>
              <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[g.status]}`}>
                {g.status}
              </span>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No {filter.toLowerCase()} guests.</li>
          )}
        </ul>
      </section>
      )}
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-[var(--paper-2)] p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}
