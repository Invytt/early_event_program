import { vi, beforeEach } from "vitest"

// Deterministic clock for any code that reads Date.now()/new Date().
// Individual tests override with vi.setSystemTime as needed.
export const FIXED_NOW = new Date("2026-06-19T12:00:00.000Z")

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

// Quiet the intentional console.warn/error in email/storage fallbacks so test
// output stays readable. Tests that assert on logging can spy locally.
vi.spyOn(console, "warn").mockImplementation(() => {})
vi.spyOn(console, "error").mockImplementation(() => {})
