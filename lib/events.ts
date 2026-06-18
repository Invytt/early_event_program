export type EventInvite = {
  id: string
  name: string
  description: string
  location: string
  date: string // ISO yyyy-MM-dd
  time: string // 24h "HH:mm"
  host: string
  cover: string // tailwind gradient classes for the cover banner
  attendees: number
  status: "Going" | "Pending" | "Invited"
  requireApproval: boolean
  hideLocation: boolean
}

export const events: EventInvite[] = [
  {
    id: "summer-launch",
    name: "Summer Launch Party",
    description:
      "Join us for the official launch of our summer collection. Drinks, music, and a first look at what we've been building all season. Limited spots — RSVP early.",
    location: "The Glasshouse, 540 Brannan St, San Francisco",
    date: "2026-07-12",
    time: "18:30",
    host: "Acme Events",
    cover: "from-amber-400 to-rose-500",
    attendees: 84,
    status: "Going",
    requireApproval: false,
    hideLocation: false,
  },
  {
    id: "founders-dinner",
    name: "Founders Dinner",
    description:
      "An intimate dinner for early-stage founders to swap notes, share war stories, and meet a few investors off the record. Seats are approved manually.",
    location: "Quince, 470 Pacific Ave, San Francisco",
    date: "2026-07-20",
    time: "19:00",
    host: "Early Program",
    cover: "from-indigo-500 to-violet-600",
    attendees: 22,
    status: "Pending",
    requireApproval: true,
    hideLocation: true,
  },
  {
    id: "design-meetup",
    name: "Product Design Meetup",
    description:
      "A casual evening of lightning talks on product design, prototyping, and design systems. Bring your portfolio and your hot takes.",
    location: "WeWork, 2 Embarcadero Center, San Francisco",
    date: "2026-08-03",
    time: "17:00",
    host: "Design Guild",
    cover: "from-emerald-400 to-teal-600",
    attendees: 130,
    status: "Invited",
    requireApproval: false,
    hideLocation: false,
  },
]

export function getEvent(id: string): EventInvite | undefined {
  return events.find((e) => e.id === id)
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

/* ---------- guest / host-dashboard mock data ---------- */

export type GuestStatus = "Going" | "Pending" | "Declined"
export type Guest = { id: number; name: string; status: GuestStatus; when: string }

const FIRST = [
  "Ava", "Liam", "Noah", "Mia", "Ethan", "Sofia", "Lucas", "Isla", "Maya",
  "Kai", "Riya", "Leo", "Zoe", "Aria", "Dev", "Nina", "Omar", "Tara",
  "Eli", "Cara", "Jude", "Anya", "Ravi", "Lena",
]
const LAST = [
  "Patel", "Chen", "Garcia", "Kim", "Singh", "Lopez", "Khan", "Müller",
  "Rossi", "Nguyen", "Silva", "Cohen",
]
const WHEN = ["just now", "2h ago", "5h ago", "1d ago", "2d ago", "3d ago", "6d ago", "1w ago"]

function fullName(i: number) {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`
}

export function capacity(e: EventInvite) {
  return Math.ceil(e.attendees * 1.25)
}

export function pendingCount(e: EventInvite) {
  return e.requireApproval ? Math.max(3, Math.round(e.attendees * 0.15)) : 0
}

export function declinedCount(e: EventInvite) {
  return Math.round(e.attendees * 0.08)
}

export function getGuests(e: EventInvite): Guest[] {
  const going = e.attendees
  const pending = pendingCount(e)
  const declined = declinedCount(e)
  const total = going + pending + declined
  const out: Guest[] = []
  for (let i = 0; i < total; i++) {
    const status: GuestStatus =
      i < pending ? "Pending" : i < pending + declined ? "Declined" : "Going"
    out.push({
      id: i + 1,
      name: fullName(i),
      status,
      when: WHEN[i % WHEN.length],
    })
  }
  return out
}

// cumulative RSVPs leading up to the event (8 points)
export function rsvpSeries(e: EventInvite): number[] {
  const steps = [0.05, 0.12, 0.22, 0.35, 0.5, 0.68, 0.85, 1]
  return steps.map((s) => Math.round(e.attendees * s))
}

export type EventCounts = {
  going: number
  pending: number
  declined: number
  invited: number
  capacity: number
  pct: number // capacity used
  rsvpRate: number // going / invited
}

export function eventCounts(e: EventInvite): EventCounts {
  const going = e.attendees
  const pending = pendingCount(e)
  const declined = declinedCount(e)
  const invited = going + pending + declined
  const cap = capacity(e)
  return {
    going,
    pending,
    declined,
    invited,
    capacity: cap,
    pct: Math.min(100, Math.round((going / cap) * 100)),
    rsvpRate: invited ? Math.round((going / invited) * 100) : 0,
  }
}

// days from a reference "today" (ISO) to the event; positive = upcoming
export function daysUntil(dateISO: string, todayISO: string): number {
  const ms = new Date(dateISO).getTime() - new Date(todayISO).getTime()
  return Math.ceil(ms / 86400000)
}

export type Activity = {
  id: string
  guest: string
  action: "going" | "pending" | "declined"
  when: string
  event?: string
}

// recent activity derived from a guest list
export function activityFeed(e: EventInvite, limit = 6): Activity[] {
  const guests = getGuests(e)
  const order = ["just now", "2h ago", "5h ago", "1d ago", "2d ago", "3d ago", "6d ago", "1w ago"]
  return [...guests]
    .sort((a, b) => order.indexOf(a.when) - order.indexOf(b.when))
    .slice(0, limit)
    .map((g) => ({
      id: `${e.id}-${g.id}`,
      guest: g.name,
      action:
        g.status === "Going" ? "going" : g.status === "Pending" ? "pending" : "declined",
      when: g.when,
      event: e.name,
    }))
}

export function allActivity(limit = 8): Activity[] {
  const order = ["just now", "2h ago", "5h ago", "1d ago", "2d ago", "3d ago", "6d ago", "1w ago"]
  return events
    .flatMap((e) => activityFeed(e, 4))
    .sort((a, b) => order.indexOf(a.when) - order.indexOf(b.when))
    .slice(0, limit)
}
