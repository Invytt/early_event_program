import { describe, it, expect } from "vitest"
import { coverGradient, formatTime, daysUntil } from "@/lib/events"

describe("coverGradient", () => {
  it("is deterministic for the same id", () => {
    expect(coverGradient("abc123")).toBe(coverGradient("abc123"))
  })

  it("returns a known tailwind gradient class string", () => {
    const g = coverGradient("xyz")
    expect(g).toMatch(/^from-\S+ to-\S+$/)
  })

  it("maps different ids across the available palette", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `event-${i}`)
    const unique = new Set(ids.map(coverGradient))
    // 6 gradients defined; with 50 ids we expect to hit several buckets
    expect(unique.size).toBeGreaterThan(1)
  })

  it("handles empty string without throwing", () => {
    expect(() => coverGradient("")).not.toThrow()
    expect(coverGradient("")).toMatch(/^from-/)
  })

  it("handles long / unicode ids", () => {
    expect(coverGradient("🎉".repeat(100))).toMatch(/^from-/)
  })
})

describe("formatTime", () => {
  it("formats morning times as AM", () => {
    expect(formatTime("09:05")).toBe("9:05 AM")
  })

  it("formats afternoon times as PM", () => {
    expect(formatTime("13:30")).toBe("1:30 PM")
  })

  it("treats midnight as 12 AM", () => {
    expect(formatTime("00:00")).toBe("12:00 AM")
  })

  it("treats noon as 12 PM", () => {
    expect(formatTime("12:00")).toBe("12:00 PM")
  })

  it("zero-pads minutes", () => {
    expect(formatTime("08:00")).toBe("8:00 AM")
    expect(formatTime("23:07")).toBe("11:07 PM")
  })
})

describe("daysUntil", () => {
  const today = "2026-06-19T00:00:00.000Z"

  it("returns positive for a future date", () => {
    expect(daysUntil("2026-06-29T00:00:00.000Z", today)).toBe(10)
  })

  it("returns 0 for the same instant", () => {
    expect(daysUntil(today, today)).toBe(0)
  })

  it("returns negative for a past date", () => {
    expect(daysUntil("2026-06-09T00:00:00.000Z", today)).toBe(-10)
  })

  it("ceils partial days up (future)", () => {
    // 1.5 days ahead -> ceil -> 2
    expect(daysUntil("2026-06-20T12:00:00.000Z", today)).toBe(2)
  })
})
