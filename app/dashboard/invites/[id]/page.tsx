import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { auth } from "@clerk/nextjs/server"
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ShieldCheckIcon,
  EyeOffIcon,
} from "lucide-react"

import { AttendeesPopover } from "@/components/attendees-popover"
import { PublicRsvp } from "@/components/public-rsvp"
import { getEventForViewer } from "@/lib/db"
import { formatTime, coverGradient } from "@/lib/events"

export default async function InviteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await auth()
  const data = await getEventForViewer(id, userId ?? undefined)
  if (!data) notFound()

  const { event, dto, goingNames, myStatus } = data
  const dateLabel = format(event.startsAt, "EEEE, MMMM d, yyyy")
  const time = `${String(event.startsAt.getUTCHours()).padStart(2, "0")}:${String(
    event.startsAt.getUTCMinutes()
  ).padStart(2, "0")}`
  const locationVisible = !event.hideLocation || myStatus === "Going"
  const calUrl = gcalUrl(
    event.name,
    event.startsAt,
    event.description,
    locationVisible ? event.locationText : null
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard/invites"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to invites
      </Link>

      <div
        className={`relative flex h-48 w-full items-end overflow-hidden rounded-xl bg-gradient-to-br ${coverGradient(
          event.id
        )} p-5`}
      >
        {event.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {myStatus && (
          <span className="relative rounded-full border border-white/40 bg-black/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {myStatus}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
        <p className="text-sm text-muted-foreground">Hosted by {dto.host}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact icon={<CalendarIcon className="size-4" />} label={dateLabel} href={calUrl} />
        <Fact icon={<ClockIcon className="size-4" />} label={formatTime(time)} href={calUrl} />
        <Fact
          icon={<MapPinIcon className="size-4" />}
          label={
            locationVisible
              ? event.locationText || "No location"
              : "Location will be visible once you get approval"
          }
          href={
            locationVisible && event.locationText
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  event.locationText
                )}`
              : undefined
          }
        />
        <AttendeesPopover names={goingNames} />
      </div>

      {event.description && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">About this event</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        </section>
      )}

      {(event.requireApproval || event.hideLocation) && (
        <section className="flex flex-wrap gap-2">
          {event.requireApproval && (
            <Pill icon={<ShieldCheckIcon className="size-3.5" />} text="Approval required" />
          )}
          {event.hideLocation && (
            <Pill icon={<EyeOffIcon className="size-3.5" />} text="Location hidden until approval" />
          )}
        </section>
      )}

      <PublicRsvp
        eventId={event.id}
        slug={event.slug}
        initialStatus={myStatus}
        signedIn={Boolean(userId)}
        isHost={Boolean(userId) && userId === event.ownerId}
        requireApproval={event.requireApproval}
      />
    </div>
  )
}

// build a Google Calendar "add event" URL (defaults to a 1-hour duration)
function gcalUrl(
  name: string,
  startsAt: Date,
  description?: string | null,
  location?: string | null
) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const end = new Date(startsAt.getTime() + 60 * 60 * 1000)
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: name,
    dates: `${fmt(startsAt)}/${fmt(end)}`,
  })
  if (description) p.set("details", description)
  if (location) p.set("location", location)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

function Fact({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode
  label: string
  href?: string
}) {
  const inner = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </>
  )
  const cls =
    "flex items-center gap-3 rounded-lg border border-border bg-[var(--paper-2)] px-4 py-3 text-sm"
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`group ${cls} transition-colors hover:bg-black/[0.03]`}>
        {inner}
      </a>
    )
  }
  return <div className={cls}>{inner}</div>
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
      {icon}
      {text}
    </span>
  )
}
