import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const { auth, create } = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn() }))
vi.mock("@clerk/nextjs/server", () => ({ auth }))

// Anthropic is a default-exported class instantiated with { apiKey }
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create }
  },
}))

import { generateEventDescription } from "@/app/actions/ai"

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ userId: "u1" })
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test")
})
afterEach(() => vi.unstubAllEnvs())

describe("generateEventDescription", () => {
  it("rejects when not signed in", async () => {
    auth.mockResolvedValue({ userId: null })
    expect(await generateEventDescription({ name: "X" })).toEqual({ ok: false, error: "Not signed in" })
  })

  it("errors when the API key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "")
    const res = await generateEventDescription({ name: "X" })
    expect(res).toEqual({ ok: false, error: "AI is not configured." })
  })

  it("errors when the event name is blank", async () => {
    const res = await generateEventDescription({ name: "   " })
    expect(res).toEqual({ ok: false, error: "Add an event name first." })
    expect(create).not.toHaveBeenCalled()
  })

  it("returns the concatenated text blocks on success", async () => {
    create.mockResolvedValue({
      content: [
        { type: "text", text: "Join us " },
        { type: "tool_use" }, // non-text block ignored
        { type: "text", text: "for a great time." },
      ],
    })
    const res = await generateEventDescription({ name: "Gala", location: "NYC", dateLabel: "Fri" })
    expect(res).toEqual({ ok: true, text: "Join us for a great time." })
    // model + a user prompt containing the details were sent
    const arg = create.mock.calls[0][0]
    expect(arg.model).toBe("claude-haiku-4-5")
    expect(arg.messages[0].content).toContain("Gala")
    expect(arg.messages[0].content).toContain("NYC")
  })

  it("errors when the model returns no text", async () => {
    create.mockResolvedValue({ content: [{ type: "tool_use" }] })
    expect(await generateEventDescription({ name: "Gala" })).toEqual({
      ok: false,
      error: "No description generated.",
    })
  })

  it("surfaces the SDK error message", async () => {
    create.mockRejectedValue(new Error("rate limited"))
    expect(await generateEventDescription({ name: "Gala" })).toEqual({
      ok: false,
      error: "rate limited",
    })
  })
})
