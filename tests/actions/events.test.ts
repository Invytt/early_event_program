import { describe, it, expect, beforeEach, vi } from "vitest"

// ---- collect next/server `after` callbacks so tests can flush side-effects ----
const { afterCbs } = vi.hoisted(() => ({ afterCbs: [] as Array<() => unknown> }))
async function flushAfter() {
  for (const cb of afterCbs.splice(0)) await cb()
}

vi.mock("next/server", () => ({ after: (cb: () => unknown) => afterCbs.push(cb) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const {
  auth, currentUser, getUser, clerkClient,
  createEvent, setRsvpStatus, deleteEvent, upsertSelfRsvp,
  uploadCover, storageConfigured,
  rsvpConfirmationEmail, approvalDecisionEmail, hostNewRsvpEmail,
} = vi.hoisted(() => {
  const getUser = vi.fn()
  return {
    auth: vi.fn(),
    currentUser: vi.fn(),
    getUser,
    clerkClient: vi.fn(async () => ({ users: { getUser } })),
    createEvent: vi.fn(),
    setRsvpStatus: vi.fn(),
    deleteEvent: vi.fn(),
    upsertSelfRsvp: vi.fn(),
    uploadCover: vi.fn(),
    storageConfigured: vi.fn(() => true),
    rsvpConfirmationEmail: vi.fn(),
    approvalDecisionEmail: vi.fn(),
    hostNewRsvpEmail: vi.fn(),
  }
})
vi.mock("@clerk/nextjs/server", () => ({ auth, currentUser, clerkClient }))
vi.mock("@/lib/db", () => ({ createEvent, setRsvpStatus, deleteEvent, upsertSelfRsvp }))
vi.mock("@/lib/storage", () => ({ uploadCover, storageConfigured }))
vi.mock("@/lib/email", () => ({ rsvpConfirmationEmail, approvalDecisionEmail, hostNewRsvpEmail }))

import {
  createEventAction,
  approveRsvpAction,
  rejectRsvpAction,
  uploadCoverAction,
  rsvpAction,
  deleteEventAction,
} from "@/app/actions/events"

const validInput = {
  name: "Launch Party",
  startsAt: "2026-07-01T18:30:00.000Z",
  requireApproval: false,
  hideLocation: false,
  emailGuestRsvp: true,
  emailHostRsvp: true,
  emailDecision: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  afterCbs.length = 0
  auth.mockResolvedValue({ userId: "owner_1" })
  storageConfigured.mockReturnValue(true)
})

describe("createEventAction", () => {
  it("rejects when not signed in", async () => {
    auth.mockResolvedValue({ userId: null })
    expect(await createEventAction(validInput)).toEqual({ ok: false, error: "Not signed in" })
    expect(createEvent).not.toHaveBeenCalled()
  })

  it("returns a validation error for an empty name", async () => {
    const res = await createEventAction({ ...validInput, name: "" })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/name is required/i)
  })

  it("rejects a non-ISO startsAt", async () => {
    const res = await createEventAction({ ...validInput, startsAt: "next friday" })
    expect(res.ok).toBe(false)
  })

  it("rejects a non-positive capacity", async () => {
    const res = await createEventAction({ ...validInput, capacity: 0 })
    expect(res.ok).toBe(false)
  })

  it("creates the event for the signed-in owner and returns id/slug", async () => {
    createEvent.mockResolvedValue({ id: "evt_1", slug: "launch-party" })
    const res = await createEventAction(validInput)
    expect(res).toEqual({ ok: true, id: "evt_1", slug: "launch-party" })
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "owner_1", name: "Launch Party", startsAt: expect.any(Date) })
    )
  })
})

describe("approveRsvpAction", () => {
  it("returns an error when not signed in", async () => {
    auth.mockResolvedValue({ userId: null })
    expect(await approveRsvpAction("r1", "e1")).toEqual({
      ok: false,
      error: "Not signed in",
    })
  })

  it("sets status Going and emails the guest when decision emails are on", async () => {
    setRsvpStatus.mockResolvedValue({
      guestEmail: "g@x.com",
      guestName: "Guest",
      event: { name: "Party", startsAt: new Date("2026-07-01T18:30:00.000Z"), emailDecision: true },
    })
    await approveRsvpAction("r1", "e1")
    expect(setRsvpStatus).toHaveBeenCalledWith("owner_1", "r1", "Going")
    await flushAfter()
    expect(approvalDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({ approved: true }))
  })

  it("does not email when the event has decision emails disabled", async () => {
    setRsvpStatus.mockResolvedValue({
      guestEmail: "g@x.com",
      event: { name: "Party", startsAt: new Date(), emailDecision: false },
    })
    await approveRsvpAction("r1", "e1")
    await flushAfter()
    expect(approvalDecisionEmail).not.toHaveBeenCalled()
  })

  it("does not email when there is no guest email", async () => {
    setRsvpStatus.mockResolvedValue({
      guestEmail: null,
      event: { name: "Party", startsAt: new Date(), emailDecision: true },
    })
    await approveRsvpAction("r1", "e1")
    await flushAfter()
    expect(approvalDecisionEmail).not.toHaveBeenCalled()
  })
})

describe("rejectRsvpAction", () => {
  it("sets status Declined and sends an approved:false email", async () => {
    setRsvpStatus.mockResolvedValue({
      guestEmail: "g@x.com",
      event: { name: "Party", startsAt: new Date(), emailDecision: true },
    })
    await rejectRsvpAction("r1", "e1")
    expect(setRsvpStatus).toHaveBeenCalledWith("owner_1", "r1", "Declined")
    await flushAfter()
    expect(approvalDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({ approved: false }))
  })
})

describe("uploadCoverAction", () => {
  function fd(file?: File) {
    const f = new FormData()
    if (file) f.append("cover", file)
    return f
  }

  it("rejects when not signed in", async () => {
    auth.mockResolvedValue({ userId: null })
    expect(await uploadCoverAction(fd())).toEqual({ ok: false, error: "Not signed in" })
  })

  it("errors when storage is not configured", async () => {
    storageConfigured.mockReturnValue(false)
    const res = await uploadCoverAction(fd(new File(["x"], "c.png", { type: "image/png" })))
    expect(res.ok).toBe(false)
  })

  it("errors when no file is provided", async () => {
    const res = await uploadCoverAction(fd())
    expect(res).toEqual({ ok: false, error: "No file provided" })
  })

  it("rejects files larger than 5MB", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "c.png", { type: "image/png" })
    const res = await uploadCoverAction(fd(big))
    expect(res).toEqual({ ok: false, error: "Image must be under 5MB" })
    expect(uploadCover).not.toHaveBeenCalled()
  })

  it("uploads and returns the url on success", async () => {
    uploadCover.mockResolvedValue("https://x/covers/c.png")
    const res = await uploadCoverAction(fd(new File(["x"], "c.png", { type: "image/png" })))
    expect(res).toEqual({ ok: true, url: "https://x/covers/c.png" })
  })

  it("surfaces an upload exception as an error result", async () => {
    uploadCover.mockRejectedValue(new Error("disk full"))
    const res = await uploadCoverAction(fd(new File(["x"], "c.png", { type: "image/png" })))
    expect(res).toEqual({ ok: false, error: "disk full" })
  })
})

describe("rsvpAction", () => {
  beforeEach(() => {
    // actor is the guest; no email/name in session claims → falls back to currentUser()
    auth.mockResolvedValue({ userId: "guest_1" })
    currentUser.mockResolvedValue({
      id: "guest_1",
      firstName: "Bob",
      lastName: "Lee",
      username: "bob",
      primaryEmailAddress: { emailAddress: "bob@x.com" },
      emailAddresses: [{ emailAddress: "bob@x.com" }],
    })
    upsertSelfRsvp.mockResolvedValue({
      status: "Going",
      event: { name: "Party", ownerId: "owner_1", startsAt: new Date(), emailGuestRsvp: true, emailHostRsvp: true },
    })
    getUser.mockResolvedValue({
      firstName: "Host",
      lastName: "Person",
      username: "host",
      primaryEmailAddress: { emailAddress: "host@x.com" },
    })
  })

  it("returns an error when not signed in", async () => {
    currentUser.mockResolvedValue(null)
    expect(await rsvpAction("e1", true)).toEqual({
      ok: false,
      error: "Not signed in",
    })
  })

  it("derives display name from first+last and RSVPs", async () => {
    await rsvpAction("e1", true)
    expect(upsertSelfRsvp).toHaveBeenCalledWith("guest_1", "e1", true, {
      name: "Bob Lee",
      email: "bob@x.com",
    })
  })

  it("emails guest confirmation and host notification when going", async () => {
    await rsvpAction("e1", true)
    await flushAfter()
    expect(rsvpConfirmationEmail).toHaveBeenCalledOnce()
    expect(hostNewRsvpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: { email: "host@x.com", name: "Host Person" }, guestName: "Bob Lee" })
    )
  })

  it("does not send any emails when declining", async () => {
    upsertSelfRsvp.mockResolvedValue({
      status: "Declined",
      event: { name: "Party", ownerId: "owner_1", startsAt: new Date(), emailGuestRsvp: true, emailHostRsvp: true },
    })
    await rsvpAction("e1", false)
    await flushAfter()
    expect(rsvpConfirmationEmail).not.toHaveBeenCalled()
    expect(hostNewRsvpEmail).not.toHaveBeenCalled()
  })

  it("skips the guest email when emailGuestRsvp is off", async () => {
    upsertSelfRsvp.mockResolvedValue({
      status: "Going",
      event: { name: "Party", ownerId: "owner_1", startsAt: new Date(), emailGuestRsvp: false, emailHostRsvp: true },
    })
    await rsvpAction("e1", true)
    await flushAfter()
    expect(rsvpConfirmationEmail).not.toHaveBeenCalled()
    expect(hostNewRsvpEmail).toHaveBeenCalledOnce()
  })

  it("survives a host-lookup failure without throwing", async () => {
    getUser.mockRejectedValue(new Error("clerk down"))
    await rsvpAction("e1", true)
    await expect(flushAfter()).resolves.toBeUndefined()
    expect(rsvpConfirmationEmail).toHaveBeenCalledOnce()
  })
})

describe("deleteEventAction", () => {
  it("returns an error when not signed in", async () => {
    auth.mockResolvedValue({ userId: null })
    expect(await deleteEventAction("e1")).toEqual({
      ok: false,
      error: "Not signed in",
    })
  })

  it("deletes for the signed-in owner", async () => {
    deleteEvent.mockResolvedValue({})
    await deleteEventAction("e1")
    expect(deleteEvent).toHaveBeenCalledWith("owner_1", "e1")
  })
})
