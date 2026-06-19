import { describe, it, expect, beforeEach, vi } from "vitest"
import { makeEvent, makeRsvp } from "../factories"

// ---- mock the data + storage layers db.ts depends on ----
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    event: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    rsvp: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
  },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const { deleteCover } = vi.hoisted(() => ({ deleteCover: vi.fn() }))
vi.mock("@/lib/storage", () => ({ deleteCover }))

import {
  countsOf,
  guestsOf,
  seriesOf,
  activityOf,
  getOwnedEvents,
  getOwnedEvent,
  ownerSeries,
  recentActivity,
  getInvitedEvents,
  getEventBySlug,
  getEventForViewer,
  createEvent,
  setRsvpStatus,
  deleteEvent,
  upsertSelfRsvp,
  newRsvpsThisWeek,
} from "@/lib/db"

beforeEach(() => {
  vi.clearAllMocks()
})

/* ---------------- pure aggregation helpers ---------------- */

describe("countsOf", () => {
  it("tallies each status bucket and total invited", () => {
    const e = makeEvent({
      capacity: 10,
      rsvps: [
        makeRsvp({ status: "Going" }),
        makeRsvp({ status: "Going" }),
        makeRsvp({ status: "Pending" }),
        makeRsvp({ status: "Declined" }),
        makeRsvp({ status: "Waitlist" }),
      ],
    })
    const c = countsOf(e)
    expect(c).toMatchObject({ going: 2, pending: 1, declined: 1, waitlist: 1, invited: 5 })
  })

  it("computes capacity pct, capped at 100", () => {
    const e = makeEvent({
      capacity: 4,
      rsvps: Array.from({ length: 6 }, () => makeRsvp({ status: "Going" })),
    })
    expect(countsOf(e).pct).toBe(100) // 6/4 -> capped
  })

  it("rounds rsvpRate against total invited", () => {
    const e = makeEvent({
      capacity: 100,
      rsvps: [
        makeRsvp({ status: "Going" }),
        makeRsvp({ status: "Declined" }),
        makeRsvp({ status: "Declined" }),
      ],
    })
    expect(countsOf(e).rsvpRate).toBe(33) // 1/3
  })

  it("treats null capacity as 0 and avoids divide-by-zero", () => {
    const e = makeEvent({ capacity: null, rsvps: [] })
    const c = countsOf(e)
    expect(c.capacity).toBe(0)
    expect(c.pct).toBe(0)
    expect(c.rsvpRate).toBe(0)
  })
})

describe("guestsOf", () => {
  it("sorts most-recent first and applies name fallbacks", () => {
    const e = makeEvent({
      rsvps: [
        makeRsvp({ guestName: "Alice", createdAt: new Date("2026-06-01") }),
        makeRsvp({ guestName: null, userId: "user_abcd1234", createdAt: new Date("2026-06-03") }),
        makeRsvp({ guestName: null, userId: null, createdAt: new Date("2026-06-02") }),
      ],
    })
    const g = guestsOf(e)
    expect(g.map((x) => x.name)).toEqual(["Member 1234", "Guest", "Alice"])
  })

  it("does not mutate the source rsvps array order", () => {
    const rsvps = [
      makeRsvp({ createdAt: new Date("2026-06-01") }),
      makeRsvp({ createdAt: new Date("2026-06-05") }),
    ]
    const e = makeEvent({ rsvps })
    guestsOf(e)
    expect(rsvps[0].createdAt).toEqual(new Date("2026-06-01")) // unchanged
  })
})

describe("seriesOf", () => {
  it("returns at least 2 points and counts rsvps on their day", () => {
    const e = makeEvent({
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      startsAt: new Date("2026-06-05T00:00:00.000Z"),
      rsvps: [
        makeRsvp({ createdAt: new Date("2026-06-02T10:00:00.000Z") }),
        makeRsvp({ createdAt: new Date("2026-06-02T11:00:00.000Z") }),
      ],
    })
    const s = seriesOf(e)
    expect(s.length).toBeGreaterThanOrEqual(2)
    const total = s.reduce((n, p) => n + p.value, 0)
    expect(total).toBe(2)
  })

  it("caps the window at 60 points", () => {
    const e = makeEvent({
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      startsAt: new Date("2026-12-31T00:00:00.000Z"),
      rsvps: [],
    })
    expect(seriesOf(e).length).toBeLessThanOrEqual(60)
  })
})

describe("activityOf", () => {
  it("maps statuses to actions and respects the limit", () => {
    const e = makeEvent({
      rsvps: [
        makeRsvp({ status: "Going", createdAt: new Date("2026-06-05") }),
        makeRsvp({ status: "Pending", createdAt: new Date("2026-06-04") }),
        makeRsvp({ status: "Waitlist", createdAt: new Date("2026-06-03") }),
      ],
    })
    const a = activityOf(e, 2)
    expect(a).toHaveLength(2)
    expect(a[0].action).toBe("going")
    expect(a[1].action).toBe("pending")
    expect(a[0].event).toBe(e.name)
  })

  it("maps non-going/pending (Waitlist/Declined) to 'declined'", () => {
    const e = makeEvent({ rsvps: [makeRsvp({ status: "Waitlist" })] })
    expect(activityOf(e)[0].action).toBe("declined")
  })
})

/* ---------------- queries ---------------- */

describe("getOwnedEvents", () => {
  it("queries by owner and returns dto + counts per event", async () => {
    const e = makeEvent({ capacity: 5, rsvps: [makeRsvp({ status: "Going" })] })
    prismaMock.event.findMany.mockResolvedValue([e])
    const res = await getOwnedEvents("owner_1")
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "owner_1" } })
    )
    expect(res[0].counts.going).toBe(1)
    expect(res[0].dto.attendees).toBe(1)
    expect(res[0].dto.slug).toBe(e.slug)
  })
})

describe("getOwnedEvent", () => {
  it("scopes the lookup to the owner + id", async () => {
    const e = makeEvent({ id: "evt_1", ownerId: "owner_1" })
    prismaMock.event.findFirst.mockResolvedValue(e)
    const res = await getOwnedEvent("owner_1", "evt_1")
    expect(res).toBe(e)
    expect(prismaMock.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "evt_1", ownerId: "owner_1" } })
    )
  })
})

describe("ownerSeries", () => {
  it("builds a daily series spanning first event to last event day", async () => {
    prismaMock.rsvp.findMany.mockResolvedValue([
      { createdAt: new Date("2026-06-02T10:00:00.000Z") },
    ])
    prismaMock.event.findFirst
      .mockResolvedValueOnce({ createdAt: new Date("2026-06-01T00:00:00.000Z") }) // first
      .mockResolvedValueOnce({ startsAt: new Date("2026-06-05T00:00:00.000Z") }) // last
    const s = await ownerSeries("owner_1")
    expect(s.length).toBeGreaterThanOrEqual(2)
    expect(s.reduce((n, p) => n + p.value, 0)).toBe(1)
  })

  it("falls back to now when the owner has no events", async () => {
    prismaMock.rsvp.findMany.mockResolvedValue([])
    prismaMock.event.findFirst.mockResolvedValue(null)
    const s = await ownerSeries("owner_1")
    expect(s.length).toBeGreaterThanOrEqual(2)
  })
})

describe("recentActivity", () => {
  it("maps recent rsvps to activity rows with the event name", async () => {
    prismaMock.rsvp.findMany.mockResolvedValue([
      makeRsvp({ status: "Going", guestName: "Ann", event: makeEvent({ name: "Gala" }) }),
      makeRsvp({ status: "Pending", userId: "user_zzzz9999", guestName: null, event: makeEvent({ name: "Mixer" }) }),
    ])
    const a = await recentActivity("owner_1", 5)
    expect(a[0]).toMatchObject({ guest: "Ann", action: "going", event: "Gala" })
    expect(a[1]).toMatchObject({ guest: "Member 9999", action: "pending", event: "Mixer" })
    expect(prismaMock.rsvp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, where: { event: { ownerId: "owner_1" } } })
    )
  })
})

describe("getInvitedEvents", () => {
  it("returns the viewer's own status per event", async () => {
    const e = makeEvent({
      rsvps: [makeRsvp({ userId: "guest_1", status: "Pending" }), makeRsvp({ userId: "other" })],
    })
    prismaMock.event.findMany.mockResolvedValue([e])
    const res = await getInvitedEvents("guest_1")
    expect(res[0].myStatus).toBe("Pending")
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rsvps: { some: { userId: "guest_1" } } } })
    )
  })
})

describe("getEventBySlug", () => {
  it("returns null for an unknown slug", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)
    expect(await getEventBySlug("nope")).toBeNull()
  })

  it("returns dto, counts, going names and viewer status", async () => {
    const e = makeEvent({
      slug: "party",
      rsvps: [
        makeRsvp({ status: "Going", guestName: "Ann" }),
        makeRsvp({ status: "Going", userId: "user_4321", guestName: null }),
        makeRsvp({ status: "Pending", userId: "guest_1" }),
      ],
    })
    prismaMock.event.findUnique.mockResolvedValue(e)
    const res = await getEventBySlug("party", "guest_1")
    expect(res?.goingNames).toEqual(["Ann", "Member 4321"])
    expect(res?.myStatus).toBe("Pending")
    expect(res?.counts.going).toBe(2)
  })

  it("leaves myStatus null when no viewer id is given", async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ rsvps: [] }))
    const res = await getEventBySlug("party")
    expect(res?.myStatus).toBeNull()
  })
})

describe("getEventForViewer", () => {
  it("returns null without a viewer (no auth)", async () => {
    expect(await getEventForViewer("evt_9")).toBeNull()
  })

  it("returns null for an unknown id", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)
    expect(await getEventForViewer("missing", "owner_1")).toBeNull()
  })

  it("returns null when the viewer is neither owner nor a guest (IDOR guard)", async () => {
    const e = makeEvent({ id: "evt_9", ownerId: "owner_1", rsvps: [makeRsvp({ userId: "guest_1" })] })
    prismaMock.event.findUnique.mockResolvedValue(e)
    expect(await getEventForViewer("evt_9", "stranger")).toBeNull()
  })

  it("lets the owner read the event with going names", async () => {
    const e = makeEvent({ id: "evt_9", ownerId: "owner_1", rsvps: [makeRsvp({ status: "Going", guestName: "Zed" })] })
    prismaMock.event.findUnique.mockResolvedValue(e)
    const res = await getEventForViewer("evt_9", "owner_1")
    expect(prismaMock.event.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "evt_9" } })
    )
    expect(res?.goingNames).toEqual(["Zed"])
  })

  it("lets a guest who has an RSVP read the event", async () => {
    const e = makeEvent({ id: "evt_9", ownerId: "owner_1", rsvps: [makeRsvp({ userId: "guest_1", status: "Going", guestName: "Zed" })] })
    prismaMock.event.findUnique.mockResolvedValue(e)
    const res = await getEventForViewer("evt_9", "guest_1")
    expect(res?.goingNames).toEqual(["Zed"])
  })
})

describe("newRsvpsThisWeek", () => {
  it("counts rsvps created in the trailing 7 days for the owner", async () => {
    prismaMock.rsvp.count.mockResolvedValue(3)
    const n = await newRsvpsThisWeek("owner_1")
    expect(n).toBe(3)
    const arg = prismaMock.rsvp.count.mock.calls[0][0]
    expect(arg.where.event).toEqual({ ownerId: "owner_1" })
    expect(arg.where.createdAt.gte).toBeInstanceOf(Date)
  })
})

/* ---------------- mutations ---------------- */

describe("createEvent", () => {
  it("slugifies the name and creates when slug is free", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)
    prismaMock.event.create.mockImplementation(async ({ data }: any) => ({ id: "evt_new", ...data }))
    const ev = await createEvent({
      ownerId: "owner_1",
      name: "My Cool Party!!!",
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      requireApproval: false,
      hideLocation: false,
      emailGuestRsvp: true,
      emailHostRsvp: true,
      emailDecision: true,
    })
    expect(ev.slug).toBe("my-cool-party")
  })

  it("falls back to 'event' when name has no slug-safe chars", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)
    prismaMock.event.create.mockImplementation(async ({ data }: any) => data)
    const ev = await createEvent({
      ownerId: "o",
      name: "!!!",
      startsAt: new Date(),
      requireApproval: false,
      hideLocation: false,
      emailGuestRsvp: true,
      emailHostRsvp: true,
      emailDecision: true,
    })
    expect(ev.slug).toBe("event")
  })

  it("appends a suffix when the base slug is taken", async () => {
    prismaMock.event.findUnique
      .mockResolvedValueOnce(makeEvent()) // base taken
      .mockResolvedValueOnce(null) // suffixed free
    prismaMock.event.create.mockImplementation(async ({ data }: any) => data)
    const ev = await createEvent({
      ownerId: "o",
      name: "Launch",
      startsAt: new Date(),
      requireApproval: false,
      hideLocation: false,
      emailGuestRsvp: true,
      emailHostRsvp: true,
      emailDecision: true,
    })
    expect(ev.slug).toMatch(/^launch-[a-z0-9]{4}$/)
  })

  it("coerces empty optional strings to null", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)
    let captured: any
    prismaMock.event.create.mockImplementation(async (args: any) => {
      captured = args.data
      return args.data
    })
    await createEvent({
      ownerId: "o",
      name: "X",
      description: "",
      locationText: "",
      startsAt: new Date(),
      requireApproval: false,
      hideLocation: false,
      emailGuestRsvp: true,
      emailHostRsvp: true,
      emailDecision: true,
    })
    expect(captured.description).toBeNull()
    expect(captured.locationText).toBeNull()
  })
})

describe("setRsvpStatus", () => {
  it("updates when the rsvp belongs to an event the user owns", async () => {
    prismaMock.rsvp.findUnique.mockResolvedValue(
      makeRsvp({ id: "r1", event: makeEvent({ ownerId: "owner_1" }) })
    )
    prismaMock.rsvp.update.mockResolvedValue({ id: "r1", status: "Going" })
    await setRsvpStatus("owner_1", "r1", "Going")
    expect(prismaMock.rsvp.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1" }, data: { status: "Going" } })
    )
  })

  it("throws when the rsvp is owned by a different host", async () => {
    prismaMock.rsvp.findUnique.mockResolvedValue(
      makeRsvp({ event: makeEvent({ ownerId: "someone_else" }) })
    )
    await expect(setRsvpStatus("owner_1", "r1", "Going")).rejects.toThrow("Not authorized")
    expect(prismaMock.rsvp.update).not.toHaveBeenCalled()
  })

  it("throws when the rsvp does not exist", async () => {
    prismaMock.rsvp.findUnique.mockResolvedValue(null)
    await expect(setRsvpStatus("owner_1", "missing", "Declined")).rejects.toThrow("Not authorized")
  })
})

describe("deleteEvent", () => {
  it("deletes an owned event and best-effort removes its cover", async () => {
    const e = makeEvent({ id: "evt_x", ownerId: "owner_1", coverUrl: "http://x/covers/a.png" })
    prismaMock.event.findFirst.mockResolvedValue(e)
    prismaMock.event.delete.mockResolvedValue(e)
    await deleteEvent("owner_1", "evt_x")
    expect(prismaMock.event.delete).toHaveBeenCalledWith({ where: { id: "evt_x" } })
    expect(deleteCover).toHaveBeenCalledWith("http://x/covers/a.png")
  })

  it("throws and does not delete when the event is not owned", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null)
    await expect(deleteEvent("owner_1", "evt_x")).rejects.toThrow("Not found")
    expect(prismaMock.event.delete).not.toHaveBeenCalled()
  })
})

describe("upsertSelfRsvp", () => {
  beforeEach(() => {
    prismaMock.rsvp.upsert.mockImplementation(async ({ create }: any) => create ?? {})
  })

  it("sets status Going when approval is not required", async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ id: "e1", ownerId: "host", requireApproval: false }))
    const { status } = await upsertSelfRsvp("guest", "e1", true)
    expect(status).toBe("Going")
  })

  it("sets status Pending when the event requires approval", async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ id: "e1", ownerId: "host", requireApproval: true }))
    const { status } = await upsertSelfRsvp("guest", "e1", true)
    expect(status).toBe("Pending")
  })

  it("sets status Declined when not going", async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ id: "e1", ownerId: "host", requireApproval: true }))
    const { status } = await upsertSelfRsvp("guest", "e1", false)
    expect(status).toBe("Declined")
  })

  it("rejects hosts RSVPing to their own event", async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ id: "e1", ownerId: "guest" }))
    await expect(upsertSelfRsvp("guest", "e1", true)).rejects.toThrow("Hosts can't RSVP")
  })

  it("throws when the event does not exist", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null)
    await expect(upsertSelfRsvp("guest", "missing", true)).rejects.toThrow("Event not found")
  })

  it("passes guest name/email into the upsert", async () => {
    prismaMock.event.findUnique.mockResolvedValue(makeEvent({ id: "e1", ownerId: "host" }))
    await upsertSelfRsvp("guest", "e1", true, { name: "Bob", email: "b@x.com" })
    const arg = prismaMock.rsvp.upsert.mock.calls[0][0]
    expect(arg.create.guestName).toBe("Bob")
    expect(arg.create.guestEmail).toBe("b@x.com")
    expect(arg.where).toEqual({ eventId_userId: { eventId: "e1", userId: "guest" } })
  })

  it("waitlists a going RSVP when the event is at capacity", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      makeEvent({
        id: "e1",
        ownerId: "host",
        capacity: 2,
        rsvps: [
          makeRsvp({ userId: "a", status: "Going" }),
          makeRsvp({ userId: "b", status: "Going" }),
        ],
      })
    )
    const { status } = await upsertSelfRsvp("guest", "e1", true)
    expect(status).toBe("Waitlist")
  })

  it("admits a going RSVP when under capacity", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      makeEvent({
        id: "e1",
        ownerId: "host",
        capacity: 2,
        rsvps: [makeRsvp({ userId: "a", status: "Going" })],
      })
    )
    const { status } = await upsertSelfRsvp("guest", "e1", true)
    expect(status).toBe("Going")
  })

  it("does not count the user's own existing Going row against capacity", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      makeEvent({
        id: "e1",
        ownerId: "host",
        capacity: 1,
        rsvps: [makeRsvp({ userId: "guest", status: "Going" })],
      })
    )
    const { status } = await upsertSelfRsvp("guest", "e1", true)
    expect(status).toBe("Going")
  })

  it("stays Pending at capacity when approval is required", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      makeEvent({
        id: "e1",
        ownerId: "host",
        requireApproval: true,
        capacity: 1,
        rsvps: [makeRsvp({ userId: "a", status: "Going" })],
      })
    )
    const { status } = await upsertSelfRsvp("guest", "e1", true)
    expect(status).toBe("Pending")
  })
})
