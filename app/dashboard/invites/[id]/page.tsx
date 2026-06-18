import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ShieldCheckIcon,
  EyeOffIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AttendeesPopover } from "@/components/attendees-popover"
import { getEvent, formatTime } from "@/lib/events"

export default async function InviteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getEvent(id)
  if (!event) notFound()

  const dateLabel = format(new Date(event.date), "EEEE, MMMM d, yyyy")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard/invites"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to invites
      </Link>

      {/* Cover */}
      <div
        className={`relative flex h-48 w-full items-end overflow-hidden rounded-xl bg-gradient-to-br ${event.cover} p-5`}
      >
        <span className="rounded-full border border-white/40 bg-black/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {event.status}
        </span>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
        <p className="text-sm text-muted-foreground">Hosted by {event.host}</p>
      </div>

      {/* Facts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact icon={<CalendarIcon className="size-4" />} label={dateLabel} />
        <Fact icon={<ClockIcon className="size-4" />} label={formatTime(event.time)} />
        <Fact
          icon={<MapPinIcon className="size-4" />}
          label={event.hideLocation ? "Location revealed after RSVP" : event.location}
        />
        <AttendeesPopover count={event.attendees} />
      </div>

      {/* About */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">About this event</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {event.description}
        </p>
      </section>

      {/* Settings */}
      {(event.requireApproval || event.hideLocation) && (
        <section className="flex flex-wrap gap-2">
          {event.requireApproval && (
            <Pill icon={<ShieldCheckIcon className="size-3.5" />} text="Approval required" />
          )}
          {event.hideLocation && (
            <Pill icon={<EyeOffIcon className="size-3.5" />} text="Location hidden until RSVP" />
          )}
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t border-border pt-6">
        <Button className="flex-1 sm:flex-none">Going</Button>
        <Button variant="outline" className="flex-1 sm:flex-none">
          Can&apos;t go
        </Button>
      </div>
    </div>
  )
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-[var(--paper-2)] px-4 py-3 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
      {icon}
      {text}
    </span>
  )
}
