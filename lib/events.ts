// Shared, client-safe types + pure helpers. (DB access lives in lib/db.ts.)

export type RsvpStatus = "Going" | "Pending" | "Declined" | "Waitlist"

// host-authored FAQ entry (stored as a JSON array on the event)
export type Faq = { q: string; a: string }

// one answered item in a guest's questionnaire response
export type QaPair = { q: string; a: string }

// a guest's questionnaire submission, as shown to the host in the dashboard
export type ResponseView = {
  id: string
  guest: string
  email: string | null
  when: string
  answers: QaPair[]
}

// normalize the JSON `faqs` column into a clean, bounded Faq[]
export function parseFaqs(raw: unknown): Faq[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((f) => ({
      q: typeof (f as Faq)?.q === "string" ? (f as Faq).q : "",
      a: typeof (f as Faq)?.a === "string" ? (f as Faq).a : "",
    }))
    .filter((f) => f.q.trim() && f.a.trim())
}

// normalize the JSON `questionnaire` column into a clean list of question prompts
export function parseQuestionnaire(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((q) => (typeof q === "string" ? q.trim() : ""))
    .filter(Boolean)
}

// normalize a stored questionnaire answer payload into QaPair[]
export function parseQaPairs(raw: unknown): QaPair[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((p) => ({
      q: typeof (p as QaPair)?.q === "string" ? (p as QaPair).q : "",
      a: typeof (p as QaPair)?.a === "string" ? (p as QaPair).a : "",
    }))
    .filter((p) => p.q.trim() && p.a.trim())
}

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

// short relative-time label ("just now", "5m ago", "3h ago", "2d ago")
export function relativeTime(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime()
  const s = (Date.now() - t) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// days from a reference "today" (ISO) to the event; positive = upcoming
export function daysUntil(dateISO: string, todayISO: string): number {
  const ms = new Date(dateISO).getTime() - new Date(todayISO).getTime()
  return Math.ceil(ms / 86400000)
}
