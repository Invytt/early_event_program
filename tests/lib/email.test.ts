import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  emailConfigured,
  sendEmail,
  rsvpConfirmationEmail,
  approvalDecisionEmail,
  hostNewRsvpEmail,
} from "@/lib/email"

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" })
  vi.stubEnv("AUTOSEND_API_KEY", "key_123")
  vi.stubEnv("AUTOSEND_PROJECT_ID", "")
  vi.stubEnv("AUTOSEND_TEMPLATE1_ID", "tmpl_1")
  vi.stubEnv("AUTOSEND_TEMPLATE2_ID", "tmpl_2")
  vi.stubEnv("AUTOSEND_TEMPLATE3_ID", "tmpl_3")
})
afterEach(() => vi.unstubAllEnvs())

const body = () => JSON.parse(fetchMock.mock.calls[0][1].body)
const headers = () => fetchMock.mock.calls[0][1].headers

describe("emailConfigured", () => {
  it("reflects presence of the API key", () => {
    expect(emailConfigured()).toBe(true)
    vi.stubEnv("AUTOSEND_API_KEY", "")
    expect(emailConfigured()).toBe(false)
  })
})

describe("sendEmail", () => {
  it("skips the network call when no API key is set", async () => {
    vi.stubEnv("AUTOSEND_API_KEY", "")
    await sendEmail({ to: { email: "a@x.com" }, subject: "Hi", html: "<p>hi</p>" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts html email with bearer auth", async () => {
    await sendEmail({ to: { email: "a@x.com" }, subject: "Hi", html: "<p>hi</p>" })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(headers().Authorization).toBe("Bearer key_123")
    const b = body()
    expect(b.html).toBe("<p>hi</p>")
    expect(b.subject).toBe("Hi")
    expect(b.templateId).toBeUndefined()
  })

  it("sends templateId + dynamicData when a template is given (no raw html)", async () => {
    await sendEmail({
      to: { email: "a@x.com" },
      subject: "Hi",
      templateId: "t1",
      dynamicData: { foo: "bar" },
    })
    const b = body()
    expect(b.templateId).toBe("t1")
    expect(b.dynamicData).toEqual({ foo: "bar" })
    expect(b.html).toBeUndefined()
  })

  it("adds the x-project-id header for org-admin keys", async () => {
    vi.stubEnv("AUTOSEND_PROJECT_ID", "proj_9")
    await sendEmail({ to: { email: "a@x.com" }, subject: "Hi", html: "x" })
    expect(headers()["x-project-id"]).toBe("proj_9")
  })

  it("never throws when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"))
    await expect(
      sendEmail({ to: { email: "a@x.com" }, subject: "Hi", html: "x" })
    ).resolves.toBeUndefined()
  })

  it("never throws on a non-ok response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "boom" })
    await expect(
      sendEmail({ to: { email: "a@x.com" }, subject: "Hi", html: "x" })
    ).resolves.toBeUndefined()
  })
})

describe("rsvpConfirmationEmail", () => {
  it("skips when the template id is not configured", async () => {
    vi.stubEnv("AUTOSEND_TEMPLATE1_ID", "")
    await rsvpConfirmationEmail({
      to: { email: "a@x.com", name: "A" },
      slug: "party",
      eventName: "Party",
      whenLabel: "Sat",
      pending: false,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("sends with event details and a deep-link cta", async () => {
    await rsvpConfirmationEmail({
      to: { email: "a@x.com", name: "A" },
      slug: "party",
      eventName: "Party",
      whenLabel: "Sat 6pm",
      pending: false,
    })
    const b = body()
    expect(b.templateId).toBe("tmpl_1")
    expect(b.subject).toContain("Party")
    expect(b.dynamicData.event_name).toBe("Party")
    expect(b.dynamicData.cta_url).toContain("/e/party")
  })
})

describe("approvalDecisionEmail", () => {
  it("uses an approved subject + green accent when approved", async () => {
    await approvalDecisionEmail({
      to: { email: "a@x.com" },
      slug: "gala",
      eventName: "Gala",
      whenLabel: "Fri",
      approved: true,
    })
    const b = body()
    expect(b.subject).toContain("in")
    expect(b.dynamicData.accent).toBe("#15803d")
    expect(b.dynamicData.status).toContain("Approved")
    expect(b.dynamicData.cta_url).toContain("/e/gala")
  })

  it("uses a rejection note + red accent when declined", async () => {
    await approvalDecisionEmail({
      to: { email: "a@x.com" },
      slug: "gala",
      eventName: "Gala",
      whenLabel: "Fri",
      approved: false,
    })
    const b = body()
    expect(b.dynamicData.accent).toBe("#b91c1c")
    expect(b.dynamicData.cta_url).toContain("/e/gala")
  })
})

describe("hostNewRsvpEmail", () => {
  it("frames a pending request and links to the approval queue", async () => {
    await hostNewRsvpEmail({
      to: { email: "h@x.com" },
      eventId: "e1",
      eventName: "Mixer",
      guestName: "Bob",
      whenLabel: "Tue",
      pending: true,
    })
    const b = body()
    expect(b.subject).toContain("request")
    expect(b.dynamicData.status).toBe("Pending approval")
    expect(b.dynamicData.cta_url).toContain("/dashboard/events/e1")
  })

  it("frames a confirmed RSVP and links to the dashboard", async () => {
    await hostNewRsvpEmail({
      to: { email: "h@x.com" },
      eventId: "e1",
      eventName: "Mixer",
      guestName: "Bob",
      whenLabel: "Tue",
      pending: false,
    })
    const b = body()
    expect(b.subject).toContain("RSVP")
    expect(b.dynamicData.status).toBe("Going")
  })
})
