"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server"
import { format } from "date-fns"
import { z } from "zod"

import { formatTime, type RsvpStatus } from "@/lib/events"
import {
  rsvpConfirmationEmail,
  approvalDecisionEmail,
  hostNewRsvpEmail,
} from "@/lib/email"

import {
  createEvent,
  updateEvent,
  setRsvpStatus,
  deleteEvent,
  upsertSelfRsvp,
} from "@/lib/db"
import { uploadCover, storageConfigured } from "@/lib/storage"
import { rateLimit } from "@/lib/ratelimit"
import { reportError } from "@/lib/observability"

function whenOf(startsAt: Date) {
  const time = `${String(startsAt.getUTCHours()).padStart(2, "0")}:${String(
    startsAt.getUTCMinutes()
  ).padStart(2, "0")}`
  return `${format(startsAt, "EEE, MMM d")} · ${formatTime(time)}`
}

// cuid-ish id guard for action params coming from the client
const idSchema = z.string().trim().min(1).max(64)

const createSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(2000),
  location: z.string().trim().min(1, "Location is required").max(300),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  capacity: z.number().int().positive("Capacity is required").max(1_000_000),
  requireApproval: z.boolean(),
  hideLocation: z.boolean(),
  emailGuestRsvp: z.boolean(),
  emailHostRsvp: z.boolean(),
  emailDecision: z.boolean(),
  startsAt: z
    .string()
    .datetime()
    .refine((s) => new Date(s).getTime() > Date.now(), "Event must be in the future"), // ISO
  timezone: z.string().optional(),
  coverUrl: z.string().url("Cover image is required"),
})

export type CreateEventResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string }

export async function createEventAction(
  input: z.input<typeof createSchema>
): Promise<CreateEventResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const d = parsed.data

  const event = await createEvent({
    ownerId: userId,
    name: d.name,
    description: d.description || undefined,
    locationText: d.location || undefined,
    placeId: d.placeId,
    lat: d.lat,
    lng: d.lng,
    startsAt: new Date(d.startsAt),
    timezone: d.timezone,
    capacity: d.capacity ?? null,
    requireApproval: d.requireApproval,
    hideLocation: d.hideLocation,
    emailGuestRsvp: d.emailGuestRsvp,
    emailHostRsvp: d.emailHostRsvp,
    emailDecision: d.emailDecision,
    coverUrl: d.coverUrl,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/my-invitations")
  return { ok: true, id: event.id, slug: event.slug }
}

// Edit reuses the create fields but drops the "must be in the future" rule
// (hosts may tweak details of an event that is already imminent) and adds the id.
const updateSchema = createSchema
  .extend({
    id: idSchema,
    startsAt: z.string().datetime(),
  })

export async function updateEventAction(
  input: z.input<typeof updateSchema>
): Promise<CreateEventResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const d = parsed.data

  try {
    const event = await updateEvent(userId, d.id, {
      name: d.name,
      description: d.description || undefined,
      locationText: d.location || undefined,
      placeId: d.placeId,
      lat: d.lat,
      lng: d.lng,
      startsAt: new Date(d.startsAt),
      timezone: d.timezone,
      capacity: d.capacity ?? null,
      requireApproval: d.requireApproval,
      hideLocation: d.hideLocation,
      emailGuestRsvp: d.emailGuestRsvp,
      emailHostRsvp: d.emailHostRsvp,
      emailDecision: d.emailDecision,
      coverUrl: d.coverUrl,
    })
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/my-invitations")
    revalidatePath(`/dashboard/events/${event.id}`)
    revalidatePath(`/e/${event.slug}`)
    return { ok: true, id: event.id, slug: event.slug }
  } catch {
    return { ok: false, error: "Could not update event" }
  }
}

export type ActionResult = { ok: true } | { ok: false; error: string }

async function decideRsvp(
  rsvpId: string,
  approved: boolean
): Promise<ActionResult> {
  if (!idSchema.safeParse(rsvpId).success) {
    return { ok: false, error: "Invalid request" }
  }
  try {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: "Not signed in" }
    const r = await setRsvpStatus(userId, rsvpId, approved ? "Going" : "Declined")
    if (r.guestEmail && r.event.emailDecision) {
      const email = r.guestEmail
      after(() =>
        approvalDecisionEmail({
          to: { email, name: r.guestName ?? undefined },
          guestName: r.guestName ?? undefined,
          eventId: r.event.id,
          eventName: r.event.name,
          whenLabel: whenOf(r.event.startsAt),
          approved,
        })
      )
    }
    // refresh host queue, guest's invite view, and the public page (going count)
    revalidatePath(`/dashboard/events/${r.event.id}`)
    revalidatePath(`/dashboard/invites/${r.event.id}`)
    revalidatePath(`/e/${r.event.slug}`)
    return { ok: true }
  } catch (e) {
    reportError("decideRsvp", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}

export async function approveRsvpAction(rsvpId: string, _eventId?: string) {
  return decideRsvp(rsvpId, true)
}

export async function rejectRsvpAction(rsvpId: string, _eventId?: string) {
  return decideRsvp(rsvpId, false)
}

export type UploadCoverResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

export async function uploadCoverAction(
  formData: FormData
): Promise<UploadCoverResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }
  if (!storageConfigured()) {
    return { ok: false, error: "Image storage is not configured." }
  }
  const file = formData.get("cover")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be under 5MB" }
  }
  try {
    const url = await uploadCover(file)
    return { ok: true, url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" }
  }
}

export async function rsvpAction(
  eventId: string,
  going: boolean
): Promise<
  { ok: true; status: RsvpStatus } | { ok: false; error: string }
> {
  if (!idSchema.safeParse(eventId).success) {
    return { ok: false, error: "Invalid event" }
  }
  try {
    return await doRsvp(eventId, going)
  } catch (e) {
    reportError("rsvpAction", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}

async function doRsvp(
  eventId: string,
  going: boolean
): Promise<
  { ok: true; status: RsvpStatus } | { ok: false; error: string }
> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }
  if (!rateLimit(`rsvp:${userId}`, 20, 60_000)) {
    return { ok: false, error: "Too many changes — slow down for a moment." }
  }

  // Fast path: pull name/email straight from the session token (local, no
  // network). To enable, add `email`, `firstName`, `lastName` to the Clerk
  // session token claims (Dashboard → Sessions → Customize). If absent we fall
  // back to a currentUser() network fetch so this stays correct either way.
  const claims = sessionClaims as
    | { email?: string; firstName?: string; lastName?: string }
    | undefined
  let email = claims?.email
  let name = [claims?.firstName, claims?.lastName].filter(Boolean).join(" ")

  if (!email || !name) {
    const user = await currentUser()
    if (!user) return { ok: false, error: "Not signed in" }
    email =
      email ??
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      undefined
    name =
      name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Guest"
  }
  name = name || "Guest"

  const { event, status } = await upsertSelfRsvp(userId, eventId, going, {
    name,
    email,
  })

  if (going) {
    const whenLabel = whenOf(event.startsAt)
    const pending = status === "Pending"
    // send emails after the response is returned (non-blocking)
    after(async () => {
      if (email && event.emailGuestRsvp) {
        await rsvpConfirmationEmail({
          to: { email, name },
          eventId,
          eventName: event.name,
          whenLabel,
          pending,
        })
      }
      // notify host
      try {
        if (!event.emailHostRsvp) return
        const host = await (await clerkClient()).users.getUser(event.ownerId)
        const hostEmail = host.primaryEmailAddress?.emailAddress
        if (hostEmail) {
          const hostName =
            [host.firstName, host.lastName].filter(Boolean).join(" ") ||
            host.username ||
            undefined
          await hostNewRsvpEmail({
            to: { email: hostEmail, name: hostName },
            hostName,
            eventId,
            eventName: event.name,
            guestName: name,
            whenLabel,
            pending,
          })
        }
      } catch {
        /* host lookup failed — non-fatal */
      }
    })
  }

  revalidatePath(`/dashboard/invites/${eventId}`)
  revalidatePath("/dashboard/invites")
  revalidatePath(`/e/${event.slug}`)
  return { ok: true, status }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid event" }
  try {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: "Not signed in" }
    await deleteEvent(userId, id)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/my-invitations")
    return { ok: true }
  } catch (e) {
    reportError("deleteEventAction", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}
