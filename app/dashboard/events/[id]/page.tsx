import { notFound } from "next/navigation"
import { format } from "date-fns"
import { auth } from "@clerk/nextjs/server"

import { EventDashboard } from "@/components/event-dashboard"
import {
  getOwnedEvent,
  countsOf,
  guestsOf,
  seriesOf,
  activityOf,
} from "@/lib/db"
import { formatTime, daysUntil, coverGradient } from "@/lib/events"

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const event = await getOwnedEvent(userId, id)
  if (!event) notFound()

  const counts = countsOf(event)
  const date = event.startsAt.toISOString().slice(0, 10)
  const time = `${String(event.startsAt.getUTCHours()).padStart(2, "0")}:${String(
    event.startsAt.getUTCMinutes()
  ).padStart(2, "0")}`

  return (
    <EventDashboard
      event={{
        id: event.id,
        slug: event.slug,
        name: event.name,
        description: event.description ?? "",
        location: event.locationText ?? "",
        hideLocation: event.hideLocation,
        requireApproval: event.requireApproval,
        capacity: event.capacity,
        date,
        time,
        startsAt: event.startsAt.toISOString(),
        host: "You",
        cover: coverGradient(event.id),
        coverUrl: event.coverUrl,
        attendees: counts.going,
      }}
      initialGuests={guestsOf(event)}
      capacity={event.capacity ?? Math.max(counts.going, 1)}
      series={seriesOf(event)}
      dateLabel={format(event.startsAt, "EEE, MMM d, yyyy")}
      timeLabel={formatTime(time)}
      daysAway={daysUntil(event.startsAt.toISOString(), new Date().toISOString())}
      activity={activityOf(event)}
    />
  )
}
