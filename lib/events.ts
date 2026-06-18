// Shared, client-safe types + pure helpers. (DB access lives in lib/db.ts.)

export type RsvpStatus = "Going" | "Pending" | "Declined" | "Waitlist"

export type EventView = {
  id: string
  slug: string
  name: string
  description: string
  location: string
  hideLocation: boolean
  requireApproval: boolean
  capacity: number | null
  date: string // yyyy-MM-dd
  time: string // 24h HH:mm
  startsAt: string // ISO
  host: string
  cover: string // tailwind gradient classes (fallback when no image)
  coverUrl: string | null
  attendees: number // going count
}

export type GuestView = {
  id: string
  name: string
  status: RsvpStatus
  when: string
}

export type CountsView = {
  going: number
  pending: number
  declined: number
  waitlist: number
  invited: number
  capacity: number
  pct: number
  rsvpRate: number
}

export type ActivityView = {
  id: string
  guest: string
  action: "going" | "pending" | "declined"
  when: string
  event?: string
}

const GRADIENTS = [
  "from-amber-400 to-rose-500",
  "from-indigo-500 to-violet-600",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-400 to-green-600",
]

// deterministic gradient fallback cover from an id
export function coverGradient(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

// days from a reference "today" (ISO) to the event; positive = upcoming
export function daysUntil(dateISO: string, todayISO: string): number {
  const ms = new Date(dateISO).getTime() - new Date(todayISO).getTime()
  return Math.ceil(ms / 86400000)
}
