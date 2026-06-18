"use server"

import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@clerk/nextjs/server"

export type GenerateDescResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export async function generateEventDescription(input: {
  name: string
  location?: string
  dateLabel?: string
}): Promise<GenerateDescResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "AI is not configured." }
  }
  if (!input.name.trim()) {
    return { ok: false, error: "Add an event name first." }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const details = [
    `Event name: ${input.name}`,
    input.location ? `Location: ${input.location}` : null,
    input.dateLabel ? `When: ${input.dateLabel}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 250,
      system:
        "You write short, inviting event descriptions for an invitation page. " +
        "2-3 sentences, ~40-60 words. Warm but not cheesy. Plain text only — " +
        "no markdown, no headings, no emojis, no quotes around the text. " +
        "Return only the description.",
      messages: [
        {
          role: "user",
          content: `Write an event description from these details:\n${details}`,
        },
      ],
    })
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
    if (!text) return { ok: false, error: "No description generated." }
    return { ok: true, text }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generation failed",
    }
  }
}
