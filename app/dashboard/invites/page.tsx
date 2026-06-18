"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { SearchIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { events, formatTime } from "@/lib/events"

const statusStyles: Record<string, string> = {
  Going: "bg-green-500/15 text-green-700 border-green-600/30",
  Pending: "bg-amber-500/15 text-amber-700 border-amber-600/30",
  Invited: "bg-blue-500/15 text-blue-700 border-blue-600/30",
}

export default function InvitesPage() {
  const [query, setQuery] = React.useState("")

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter((e) =>
      [e.name, e.location, e.host, e.status].some((f) =>
        f.toLowerCase().includes(q)
      )
    )
  }, [query])

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invites</h1>
          <p className="text-sm text-muted-foreground">
            Events you&apos;ve been invited to.
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
          {shown.map((e) => (
            <Link key={e.id} href={`/dashboard/invites/${e.id}`} className="group">
              <Card className="overflow-hidden bg-[var(--paper-2)] pt-0 transition-shadow group-hover:shadow-md">
                <div className={`h-32 w-full bg-gradient-to-br ${e.cover}`} />
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="leading-snug">{e.name}</CardTitle>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[e.status]}`}
                    >
                      {e.status}
                    </span>
                  </div>
                  <CardDescription>
                    {format(new Date(e.date), "EEE, MMM d")} · {formatTime(e.time)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="line-clamp-1">{e.location}</span>
                  <span>
                    {e.attendees} going · Hosted by {e.host}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
