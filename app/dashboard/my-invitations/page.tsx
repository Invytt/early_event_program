import { auth } from "@clerk/nextjs/server"

import { EventsGrid, type EventGridItem } from "@/components/events-grid"
import { getOwnedEventsList } from "@/lib/db"

export default async function MyInvitationsPage() {
  const { userId } = await auth()
  const items: EventGridItem[] = userId ? await getOwnedEventsList(userId) : []

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
