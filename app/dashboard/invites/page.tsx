import { auth } from "@clerk/nextjs/server"

import { EventsGrid, type EventGridItem } from "@/components/events-grid"
import { getInvitedEvents } from "@/lib/db"

export default async function InvitesPage() {
  const { userId } = await auth()
  const invited = userId ? await getInvitedEvents(userId) : []

  const items: EventGridItem[] = invited.map(({ dto, counts, myStatus }) => ({
    id: dto.id,
    name: dto.name,
    startsAt: dto.startsAt,
    time: dto.time,
    cover: dto.cover,
    coverUrl: dto.coverUrl,
    // honor hide-location: only reveal once the guest is confirmed (Going)
    location:
      dto.hideLocation && myStatus !== "Going"
        ? "Location revealed after RSVP"
        : dto.location,
    going: counts.going,
    pending: counts.pending,
  }))

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Invites</h1>
        <p className="text-sm text-muted-foreground">
          Events you&apos;ve responded to.
        </p>
      </header>

      <EventsGrid items={items} hrefBase="/dashboard/invites" />
    </>
  )
}
