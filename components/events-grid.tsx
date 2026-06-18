"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { formatTime } from "@/lib/events"

export type EventGridItem = {
  id: string
  name: string
  startsAt: string
  time: string
  cover: string
  coverUrl: string | null
  location: string
  going: number
  pending: number
}

export function EventsGrid({
  items,
  hrefBase = "/dashboard/events",
}: {
  items: EventGridItem[]
  hrefBase?: string
}) {
  const [query, setQuery] = React.useState("")

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((e) =>
      [e.name, e.location].some((f) => f.toLowerCase().includes(q))
    )
  }, [query, items])

  return (
    <>
      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events…"
          className="pl-9"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events yet. Create one to get started.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((e) => (
            <Link key={e.id} href={`${hrefBase}/${e.id}`} className="group">
              <div className="overflow-hidden rounded-xl border border-border bg-[var(--paper-2)] transition-shadow group-hover:shadow-md">
                {e.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.coverUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className={`h-32 w-full bg-gradient-to-br ${e.cover}`} />
                )}
                <div className="flex flex-col gap-1 p-4">
                  <span className="font-semibold leading-snug">{e.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(e.startsAt), "EEE, MMM d")} · {formatTime(e.time)}
                  </span>
                  <span className="line-clamp-1 text-sm text-muted-foreground">
                    {e.location || "No location"}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {e.going} going · {e.pending} pending
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
