import { notFound } from "next/navigation"
import { format } from "date-fns"

import { EventDashboard } from "@/components/event-dashboard"
import {
  getEvent,
  getGuests,
  capacity,
  rsvpSeries,
  formatTime,
  daysUntil,
  activityFeed,
} from "@/lib/events"

const TODAY = new Date().toISOString().slice(0, 10)

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getEvent(id)
  if (!event) notFound()

  return (
    <EventDashboard
      event={event}
      initialGuests={getGuests(event)}
      capacity={capacity(event)}
      series={rsvpSeries(event)}
      dateLabel={format(new Date(event.date), "EEE, MMM d, yyyy")}
      timeLabel={formatTime(event.time)}
      daysAway={daysUntil(event.date, TODAY)}
      activity={activityFeed(event)}
    />
  )
}
