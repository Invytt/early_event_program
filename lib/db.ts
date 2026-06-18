import "server-only"

import { eachDayOfInterval, endOfDay, startOfDay, format, subDays } from "date-fns"

import { prisma } from "@/lib/prisma"
import type { Prisma, RsvpStatus } from "@prisma/client"
import {
  coverGradient,
  type EventView,
  type GuestView,
  type CountsView,
  type ActivityView,
} from "@/lib/events"
import { deleteCover } from "@/lib/storage"

/* ---------- helpers ---------- */

function rel(d: Date): string {
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

type EventWithRsvps = Prisma.EventGetPayload<{ include: { rsvps: true } }>

function toDTO(e: EventWithRsvps): EventView {
  const going = e.rsvps.filter((r) => r.status === "Going").length
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    description: e.description ?? "",
    location: e.locationText ?? "",
    hideLocation: e.hideLocation,
    requireApproval: e.requireApproval,
    capacity: e.capacity,
    date: e.startsAt.toISOString().slice(0, 10),
    time: `${pad(e.startsAt.getUTCHours())}:${pad(e.startsAt.getUTCMinutes())}`,
    startsAt: e.startsAt.toISOString(),
    host: "You",
    cover: coverGradient(e.id),
    coverUrl: e.coverUrl,
    attendees: going,
  }
}

export function countsOf(e: EventWithRsvps): CountsView {
  const going = e.rsvps.filter((r) => r.status === "Going").length
  const pending = e.rsvps.filter((r) => r.status === "Pending").length
  const declined = e.rsvps.filter((r) => r.status === "Declined").length
  const waitlist = e.rsvps.filter((r) => r.status === "Waitlist").length
  const invited = going + pending + declined + waitlist
  const cap = e.capacity ?? 0
  return {
    going,
    pending,
    declined,
    waitlist,
    invited,
    capacity: cap,
    pct: cap ? Math.min(100, Math.round((going / cap) * 100)) : 0,
    rsvpRate: invited ? Math.round((going / invited) * 100) : 0,
  }
}

export function guestsOf(e: EventWithRsvps): GuestView[] {
  return [...e.rsvps]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((r) => ({
      id: r.id,
      name: r.guestName ?? (r.userId ? `Member ${r.userId.slice(-4)}` : "Guest"),
      status: r.status,
      when: rel(r.createdAt),
    }))
}

export type SeriesPoint = { label: string; value: number }

// day-wise RSVP count (how many people responded that day, any status)
// from `start` (creation) to `end` (event day)
function buildDailySeries(rsvpDates: Date[], start: Date, end: Date): SeriesPoint[] {
  let from = startOfDay(start)
  let to = startOfDay(end)
  if (to < from) to = from
  const cap = subDays(to, 59) // hard cap at 60 points, anchored to the event day
  if (from < cap) from = cap
  if (from.getTime() === to.getTime()) from = subDays(to, 1) // ≥2 points
  const days = eachDayOfInterval({ start: from, end: to })
  const times = rsvpDates.map((d) => d.getTime())
  return days.map((day) => {
    const s = startOfDay(day).getTime()
    const e = endOfDay(day).getTime()
    const value = times.filter((t) => t >= s && t <= e).length
    return { label: format(day, "MMM d"), value }
  })
}

export function seriesOf(e: EventWithRsvps): SeriesPoint[] {
  return buildDailySeries(
    e.rsvps.map((r) => r.createdAt),
    e.createdAt,
    e.startsAt
  )
}

export function activityOf(e: EventWithRsvps, limit = 6): ActivityView[] {
  return guestsOf(e)
    .slice(0, limit)
    .map((g) => ({
      id: g.id,
      guest: g.name,
      action:
        g.status === "Going" ? "going" : g.status === "Pending" ? "pending" : "declined",
      when: g.when,
      event: e.name,
    }))
}

/* ---------- queries ---------- */

export async function getOwnedEvents(ownerId: string) {
  const events = await prisma.event.findMany({
    where: { ownerId },
    include: { rsvps: true },
    orderBy: { startsAt: "asc" },
  })
  return events.map((e) => ({ dto: toDTO(e), counts: countsOf(e), raw: e }))
}

export async function getOwnedEvent(ownerId: string, id: string) {
  const e = await prisma.event.findFirst({
    where: { id, ownerId },
    include: { rsvps: true },
  })
  return e
}

export async function newRsvpsThisWeek(ownerId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 86400000)
  return prisma.rsvp.count({
    where: { event: { ownerId }, createdAt: { gte: since } },
  })
}

export async function ownerSeries(ownerId: string): Promise<SeriesPoint[]> {
  const [rsvps, firstEvent, lastEvent] = await Promise.all([
    prisma.rsvp.findMany({
      where: { event: { ownerId } },
      select: { createdAt: true },
    }),
    prisma.event.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.event.findFirst({
      where: { ownerId },
      orderBy: { startsAt: "desc" },
      select: { startsAt: true },
    }),
  ])
  const now = new Date()
  return buildDailySeries(
    rsvps.map((r) => r.createdAt),
    firstEvent?.createdAt ?? now,
    lastEvent?.startsAt ?? now
  )
}

export async function recentActivity(
  ownerId: string,
  limit = 8
): Promise<ActivityView[]> {
  const rsvps = await prisma.rsvp.findMany({
    where: { event: { ownerId } },
    include: { event: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return rsvps.map((r) => ({
    id: r.id,
    guest: r.guestName ?? (r.userId ? `Member ${r.userId.slice(-4)}` : "Guest"),
    action:
      r.status === "Going" ? "going" : r.status === "Pending" ? "pending" : "declined",
    when: rel(r.createdAt),
    event: r.event.name,
  }))
}

// events the signed-in user has responded to (guest perspective)
export async function getInvitedEvents(userId: string) {
  const events = await prisma.event.findMany({
    where: { rsvps: { some: { userId } } },
    include: { rsvps: true },
    orderBy: { startsAt: "asc" },
  })
  return events.map((e) => ({
    dto: toDTO(e),
    counts: countsOf(e),
    myStatus: e.rsvps.find((r) => r.userId === userId)?.status ?? null,
  }))
}

// PUBLIC read by slug — for the shareable /e/[slug] page (no auth required to view)
export async function getEventBySlug(slug: string, userId?: string) {
  const e = await prisma.event.findUnique({ where: { slug }, include: { rsvps: true } })
  if (!e) return null
  return {
    event: e,
    dto: toDTO(e),
    counts: countsOf(e),
    goingNames: e.rsvps
      .filter((r) => r.status === "Going")
      .map((r) => r.guestName ?? (r.userId ? `Member ${r.userId.slice(-4)}` : "Guest")),
    myStatus: userId ? e.rsvps.find((r) => r.userId === userId)?.status ?? null : null,
  }
}

// any signed-in viewer can read an event by id (true public access is deferred)
export async function getEventForViewer(id: string, userId?: string) {
  const e = await prisma.event.findUnique({ where: { id }, include: { rsvps: true } })
  if (!e) return null
  return {
    event: e,
    dto: toDTO(e),
    counts: countsOf(e),
    goingNames: e.rsvps
      .filter((r) => r.status === "Going")
      .map((r) => r.guestName ?? (r.userId ? `Member ${r.userId.slice(-4)}` : "Guest")),
    myStatus: userId ? e.rsvps.find((r) => r.userId === userId)?.status ?? null : null,
  }
}

/* ---------- mutations ---------- */

export type CreateEventInput = {
  ownerId: string
  name: string
  description?: string
  locationText?: string
  placeId?: string
  lat?: number
  lng?: number
  startsAt: Date
  timezone?: string
  capacity?: number | null
  requireApproval: boolean
  hideLocation: boolean
  coverUrl?: string
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "event"
  )
}

export async function createEvent(input: CreateEventInput) {
  const base = slugify(input.name)
  let slug = base
  // ensure unique slug
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.event.findUnique({ where: { slug } })
    if (!exists) break
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }
  return prisma.event.create({
    data: {
      ownerId: input.ownerId,
      name: input.name,
      description: input.description || null,
      locationText: input.locationText || null,
      placeId: input.placeId || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      startsAt: input.startsAt,
      timezone: input.timezone || null,
      capacity: input.capacity ?? null,
      requireApproval: input.requireApproval,
      hideLocation: input.hideLocation,
      coverUrl: input.coverUrl || null,
      slug,
    },
  })
}

export async function setRsvpStatus(
  ownerId: string,
  rsvpId: string,
  status: RsvpStatus
) {
  // verify the rsvp belongs to an event owned by this user
  const rsvp = await prisma.rsvp.findUnique({
    where: { id: rsvpId },
    include: { event: true },
  })
  if (!rsvp || rsvp.event.ownerId !== ownerId) throw new Error("Not authorized")
  return prisma.rsvp.update({
    where: { id: rsvpId },
    data: { status },
    include: { event: true },
  })
}

export async function deleteEvent(ownerId: string, id: string) {
  const e = await prisma.event.findFirst({ where: { id, ownerId } })
  if (!e) throw new Error("Not found")
  const res = await prisma.event.delete({ where: { id } })
  await deleteCover(e.coverUrl) // remove cover image from storage (best-effort)
  return res
}

// signed-in user RSVPs to an event (going → Pending if approval required)
export async function upsertSelfRsvp(
  userId: string,
  eventId: string,
  going: boolean,
  guest?: { name?: string; email?: string }
) {
  const ev = await prisma.event.findUnique({ where: { id: eventId } })
  if (!ev) throw new Error("Event not found")
  if (ev.ownerId === userId) throw new Error("Hosts can't RSVP to their own event")
  const status: RsvpStatus = going
    ? ev.requireApproval
      ? "Pending"
      : "Going"
    : "Declined"
  const rsvp = await prisma.rsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: {
      eventId,
      userId,
      status,
      guestName: guest?.name ?? null,
      guestEmail: guest?.email ?? null,
    },
    update: {
      status,
      guestName: guest?.name ?? undefined,
      guestEmail: guest?.email ?? undefined,
    },
  })
  return { rsvp, event: ev, status }
}
