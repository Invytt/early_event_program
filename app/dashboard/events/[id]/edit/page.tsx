import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { EventForm } from "@/components/event-form"
import { getOwnedEvent } from "@/lib/db"
import { parseFaqs } from "@/lib/events"

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const event = await getOwnedEvent(userId, id)
  if (!event) notFound()

  return (
    <EventForm
      mode="edit"
      initial={{
        id: event.id,
        name: event.name,
        description: event.description ?? "",
        location: event.locationText ?? "",
        placeId: event.placeId ?? undefined,
        lat: event.lat ?? undefined,
        lng: event.lng ?? undefined,
        capacity: event.capacity != null ? String(event.capacity) : "",
        startsAt: event.startsAt.toISOString(),
        requireApproval: event.requireApproval,
        hideLocation: event.hideLocation,
        emailGuestRsvp: event.emailGuestRsvp,
        emailHostRsvp: event.emailHostRsvp,
        emailDecision: event.emailDecision,
        coverUrl: event.coverUrl,
        faqs: parseFaqs(event.faqs),
      }}
    />
  )
}
