"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { events, eventCounts, formatTime } from "@/lib/events"

export default function MyInvitationsPage() {
  const [query, setQuery] = React.useState("")

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter((e) =>
      [e.name, e.location, e.host].some((f) => f.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your Invitations</h1>
          <p className="text-sm text-muted-foreground">
            All your events. Select one to manage guests and approvals.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events…"
            className="pl-9"
          />
        </div>
      </header>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((e) => {
            const c = eventCounts(e)
            return (
              <Link key={e.id} href={`/dashboard/events/${e.id}`} className="group">
                <div className="overflow-hidden rounded-xl border border-border bg-[var(--paper-2)] transition-shadow group-hover:shadow-md">
                  <div className={`h-32 w-full bg-gradient-to-br ${e.cover}`} />
                  <div className="flex flex-col gap-1 p-4">
                    <span className="font-semibold leading-snug">{e.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(e.date), "EEE, MMM d")} · {formatTime(e.time)}
                    </span>
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                      {e.location}
                    </span>
                    <span className="mt-1 text-sm text-muted-foreground">
                      {c.going} going · {c.pending} pending
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
