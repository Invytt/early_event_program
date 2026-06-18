import { auth } from "@clerk/nextjs/server"

import { EventsGrid, type EventGridItem } from "@/components/events-grid"
import { getOwnedEvents } from "@/lib/db"

export default async function MyInvitationsPage() {
  const { userId } = await auth()
  const owned = userId ? await getOwnedEvents(userId) : []

  const items: EventGridItem[] = owned.map(({ dto, counts }) => ({
    id: dto.id,
    name: dto.name,
    startsAt: dto.startsAt,
    time: dto.time,
    cover: dto.cover,
    coverUrl: dto.coverUrl,
    location: dto.location,
    going: counts.going,
    pending: counts.pending,
  }))

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your Invitations</h1>
        <p className="text-sm text-muted-foreground">
          All your events. Select one to manage guests and approvals.
        </p>
      </header>

      <EventsGrid items={items} />
    </>
  )
}
