"use server"

import { revalidatePath } from "next/cache"
import { auth, currentUser } from "@clerk/nextjs/server"
import { z } from "zod"

import {
  createQuestion,
  createAnswer,
  deleteQuestion,
  deleteAnswer,
} from "@/lib/db"
import { rateLimit } from "@/lib/ratelimit"
import { reportError } from "@/lib/observability"

const idSchema = z.string().trim().min(1).max(64)
const bodySchema = z.string().trim().min(1, "Write something first").max(2000)

export type QaResult = { ok: true } | { ok: false; error: string }

// Resolve a display name for the signed-in user: fast path from session token
// claims, falling back to a currentUser() fetch. Mirrors the RSVP name logic.
async function resolveAuthor(): Promise<
  { userId: string; name: string } | null
> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null
  const claims = sessionClaims as
    | { firstName?: string; lastName?: string }
    | undefined
  let name = [claims?.firstName, claims?.lastName].filter(Boolean).join(" ")
  if (!name) {
    const user = await currentUser()
    name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      "Guest"
  }
  return { userId, name: name || "Guest" }
}

export async function postQuestionAction(
  eventId: string,
  body: string
): Promise<QaResult> {
  if (!idSchema.safeParse(eventId).success) {
    return { ok: false, error: "Invalid event" }
  }
  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) {
    return { ok: false, error: parsedBody.error.issues[0]?.message ?? "Invalid input" }
  }
  try {
    const author = await resolveAuthor()
    if (!author) return { ok: false, error: "Sign in to post a question." }
    if (!rateLimit(`qa:${author.userId}`, 15, 60_000)) {
      return { ok: false, error: "Too many posts — slow down for a moment." }
    }
    const { slug } = await createQuestion({
      eventId,
      authorId: author.userId,
      authorName: author.name,
      body: parsedBody.data,
    })
    revalidatePath(`/e/${slug}`)
    return { ok: true }
  } catch (e) {
    reportError("postQuestionAction", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}

export async function postAnswerAction(
  questionId: string,
  body: string
): Promise<QaResult> {
  if (!idSchema.safeParse(questionId).success) {
    return { ok: false, error: "Invalid question" }
  }
  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) {
    return { ok: false, error: parsedBody.error.issues[0]?.message ?? "Invalid input" }
  }
  try {
    const author = await resolveAuthor()
    if (!author) return { ok: false, error: "Sign in to answer." }
    if (!rateLimit(`qa:${author.userId}`, 15, 60_000)) {
      return { ok: false, error: "Too many posts — slow down for a moment." }
    }
    const { slug } = await createAnswer({
      questionId,
      authorId: author.userId,
      authorName: author.name,
      body: parsedBody.data,
    })
    revalidatePath(`/e/${slug}`)
    return { ok: true }
  } catch (e) {
    reportError("postAnswerAction", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}

export async function deleteQuestionAction(id: string): Promise<QaResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request" }
  try {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: "Not signed in" }
    const { slug } = await deleteQuestion(userId, id)
    revalidatePath(`/e/${slug}`)
    return { ok: true }
  } catch (e) {
    reportError("deleteQuestionAction", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}

export async function deleteAnswerAction(id: string): Promise<QaResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request" }
  try {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: "Not signed in" }
    const { slug } = await deleteAnswer(userId, id)
    revalidatePath(`/e/${slug}`)
    return { ok: true }
  } catch (e) {
    reportError("deleteAnswerAction", e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" }
  }
}
