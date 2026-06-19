import "server-only"

// Lightweight in-memory sliding-window limiter.
// NOTE: per-instance only — best-effort on serverless (each lambda has its own
// map). Good enough to blunt accidental spam / cost runaways. For a hard
// distributed guarantee, swap the store for Upstash Redis / @vercel/kv.
const hits = new Map<string, number[]>()

// occasional sweep so keys for one-off users don't accumulate forever
const SWEEP_EVERY = 500
let sinceSweep = 0
function sweep(now: number, windowMs: number) {
  for (const [k, arr] of hits) {
    if (arr.every((t) => now - t >= windowMs)) hits.delete(k)
  }
}

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  if (++sinceSweep >= SWEEP_EVERY) {
    sinceSweep = 0
    sweep(now, windowMs)
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}
