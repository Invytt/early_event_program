// Test data builders matching the Prisma model shapes used by lib/db.ts.
// Kept loose (`any`) so tests don't depend on generated Prisma types.

let seq = 0
const nextId = (p: string) => `${p}_${(seq++).toString(36)}`

export type RsvpStatus = "Going" | "Pending" | "Declined" | "Waitlist"

export function makeRsvp(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: nextId("rsvp"),
    eventId: "evt_1",
    userId: null as string | null,
    guestName: null as string | null,
    guestEmail: null as string | null,
    status: "Going" as RsvpStatus,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    ...over,
  }
}

export function makeEvent(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: nextId("evt"),
    ownerId: "owner_1",
    name: "Test Event",
    description: null as string | null,
    locationText: null as string | null,
    placeId: null as string | null,
    lat: null as number | null,
    lng: null as number | null,
    coverUrl: null as string | null,
    startsAt: new Date("2026-07-01T18:30:00.000Z"),
    timezone: null as string | null,
    capacity: null as number | null,
    requireApproval: false,
    hideLocation: false,
    emailGuestRsvp: true,
    emailHostRsvp: true,
    emailDecision: true,
    faqs: null as unknown as never,
    questionnaire: null as unknown as never,
    slug: "test-event",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    rsvps: [] as ReturnType<typeof makeRsvp>[],
    ...over,
  }
}
