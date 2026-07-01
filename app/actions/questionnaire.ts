"use server"

import { revalidatePath } from "next/cache"
import { auth, currentUser } from "@clerk/nextjs/server"
import { z } from "zod"

import { submitQuestionnaireResponse } from "@/lib/db"
import { rateLimit } from "@/lib/ratelimit"
import { reportError } from "@/lib/observability"

const idSchema = z.string().trim().min(1).max(64)
const answersSchema = z
  .array(
    z.object({
      q: z.string().trim().min(1).max(200),
      a: z.string().trim().min(1, "Please answer all questions").max(2000),
    })
  )
  .min(1, "Nothing to submit")
  .max(30)

export type QaResult = { ok: true } | { ok: false; error: string }

// Resolve the signed-in guest's display name + email (session claims → fetch).
async function resolveGuest(): Promise<
  { userId: string; name: string; email?: string } | null
> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null
  const claims = sessionClaims as
    | { email?: string; firstName?: string; lastName?: string }
    | undefined
  let name = [claims?.firstName, claims?.lastName].filter(Boolean).join(" ")
  let email = claims?.email
  if (!name || !email) {
    const user = await currentUser()
    name =
      name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      "Guest"
    email =
      email ||
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses[0]?.emailAddress ||
      undefined
  }
  return { userId, name: name || "Guest", email }
}

// Guest submits their private answers to the event questionnaire.
export async function submitQuestionnaireAction(
  eventId: string,
  answers: { q: string; a: string }[]
): Promise<QaResult> {
  if (!idSchema.safeParse(eventId).success) {
    return { ok: false, error: "Invalid event" }
  }
  const parsed = answersSchema.safeParse(answers)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  try {
    const guest = await resolveGuest()
    if (!guest) return { ok: false, error: "Sign in to submit your answers." }
    if (!rateLimit(`qa:${guest.userId}`, 15, 60_000)) {
      return { ok: false, error: "Too many submissions — slow down for a moment." }
    }
    const { slug } = await submitQuestionnaireResponse({
      eventId,
      userId: guest.userId,
      guestName: guest.name,
      guestEmail: guest.email,
      answers: parsed.data,
    })
    revalidatePath(`/e/${slug}`)
    revalidatePath(`/dashboard/events/${eventId}`)
    return { ok: true }
  } catch (e) {
    reportError("submitQuestionnaireAction", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}
