"use server"

import { revalidatePath } from "next/cache"
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server"
import { format } from "date-fns"
import { z } from "zod"

import { formatTime } from "@/lib/events"
import {
  rsvpConfirmationEmail,
  approvalDecisionEmail,
  hostNewRsvpEmail,
} from "@/lib/email"

import {
  createEvent,
  setRsvpStatus,
  deleteEvent,
  upsertSelfRsvp,
} from "@/lib/db"
import { uploadCover, storageConfigured } from "@/lib/storage"

const createSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  location: z.string().trim().max(300).optional().or(z.literal("")),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  capacity: z.number().int().positive().max(1_000_000).nullable().optional(),
  requireApproval: z.boolean(),
  hideLocation: z.boolean(),
  startsAt: z.string().datetime(), // ISO
  timezone: z.string().optional(),
  coverUrl: z.string().url().optional(),
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
    coverUrl: d.coverUrl,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/my-invitations")
  return { ok: true, id: event.id, slug: event.slug }
}

export async function approveRsvpAction(rsvpId: string, eventId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Not signed in")
  const r = await setRsvpStatus(userId, rsvpId, "Going")
  if (r.guestEmail) {
    await approvalDecisionEmail({
      to: { email: r.guestEmail, name: r.guestName ?? undefined },
      eventName: r.event.name,
      approved: true,
    })
  }
  revalidatePath(`/dashboard/events/${eventId}`)
}

export async function rejectRsvpAction(rsvpId: string, eventId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Not signed in")
  const r = await setRsvpStatus(userId, rsvpId, "Declined")
  if (r.guestEmail) {
    await approvalDecisionEmail({
      to: { email: r.guestEmail, name: r.guestName ?? undefined },
      eventName: r.event.name,
      approved: false,
    })
  }
  revalidatePath(`/dashboard/events/${eventId}`)
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

export async function rsvpAction(eventId: string, going: boolean) {
  const user = await currentUser()
  if (!user) throw new Error("Not signed in")
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    undefined
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Guest"

  const { event, status } = await upsertSelfRsvp(user.id, eventId, going, {
    name,
    email,
  })

  if (going) {
    const whenLabel = `${format(event.startsAt, "EEE, MMM d")} · ${formatTime(
      `${String(event.startsAt.getUTCHours()).padStart(2, "0")}:${String(
        event.startsAt.getUTCMinutes()
      ).padStart(2, "0")}`
    )}`
    if (email) {
      await rsvpConfirmationEmail({
        to: { email, name },
        eventId,
        eventName: event.name,
        whenLabel,
        pending: status === "Pending",
      })
    }
    // notify host
    try {
      const host = await (await clerkClient()).users.getUser(event.ownerId)
      const hostEmail = host.primaryEmailAddress?.emailAddress
      if (hostEmail) {
        await hostNewRsvpEmail({
          to: { email: hostEmail },
          eventName: event.name,
          guestName: name,
          pending: status === "Pending",
        })
      }
    } catch {
      /* host lookup failed — non-fatal */
    }
  }

  revalidatePath(`/dashboard/invites/${eventId}`)
  revalidatePath("/dashboard/invites")
}

export async function deleteEventAction(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Not signed in")
  await deleteEvent(userId, id)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/my-invitations")
}
