"use client"

import * as React from "react"
import { SignUpButton } from "@clerk/nextjs"
import { Trash2Icon, MessageCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  postQuestionAction,
  postAnswerAction,
  deleteQuestionAction,
  deleteAnswerAction,
} from "@/app/actions/questions"
import type { QuestionView } from "@/lib/events"

export function Questionnaire({
  eventId,
  slug,
  questions,
  signedIn,
}: {
  eventId: string
  slug: string
  questions: QuestionView[]
  signedIn: boolean
}) {
  const [pending, startTransition] = React.useTransition()
  const [body, setBody] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  function ask() {
    const text = body.trim()
    if (!text) return
    setError(null)
    startTransition(async () => {
      const res = await postQuestionAction(eventId, text)
      if (res.ok) setBody("")
      else setError(res.error)
    })
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 font-semibold">
          <MessageCircleIcon className="size-4" />
          Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask the host or other guests anything about this event.
        </p>
      </div>

      {/* Ask box */}
      {signedIn ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ask a question…"
          />
          <div className="flex items-center justify-between gap-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="ml-auto w-fit"
              disabled={pending || !body.trim()}
              onClick={ask}
            >
              {pending ? "Posting…" : "Post question"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Sign in to ask a question.
          </p>
          <SignUpButton
            mode="modal"
            forceRedirectUrl={`/e/${slug}`}
            signInForceRedirectUrl={`/e/${slug}`}
          >
            <Button variant="outline" className="w-fit">
              Sign in
            </Button>
          </SignUpButton>
        </div>
      )}

      {/* Thread */}
      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">
          No questions yet. Be the first to ask.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {questions.map((q) => (
            <QuestionItem key={q.id} question={q} signedIn={signedIn} />
          ))}
        </ul>
      )}
    </section>
  )
}

function QuestionItem({
  question,
  signedIn,
}: {
  question: QuestionView
  signedIn: boolean
}) {
  const [pending, startTransition] = React.useTransition()
  const [replying, setReplying] = React.useState(false)
  const [body, setBody] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [removed, setRemoved] = React.useState(false)

  if (removed) return null

  function answer() {
    const text = body.trim()
    if (!text) return
    setError(null)
    startTransition(async () => {
      const res = await postAnswerAction(question.id, text)
      if (res.ok) {
        setBody("")
        setReplying(false)
      } else setError(res.error)
    })
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteQuestionAction(question.id)
      if (res.ok) setRemoved(true)
      else setError(res.error)
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-[var(--paper-2)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{question.author}</p>
          <p className="text-xs text-muted-foreground">{question.when}</p>
        </div>
        {question.canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete question"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-destructive disabled:opacity-50"
          >
            <Trash2Icon className="size-4" />
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.body}</p>

      {/* Answers */}
      {question.answers.length > 0 && (
        <ul className="flex flex-col gap-3 border-l border-border pl-4">
          {question.answers.map((a) => (
            <AnswerItem key={a.id} answer={a} />
          ))}
        </ul>
      )}

      {/* Reply */}
      {signedIn &&
        (replying ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Write an answer…"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setReplying(false)
                  setBody("")
                }}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={pending || !body.trim()} onClick={answer}>
                {pending ? "Posting…" : "Answer"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="w-fit text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Answer
          </button>
        ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </li>
  )
}

function AnswerItem({ answer }: { answer: QuestionView["answers"][number] }) {
  const [pending, startTransition] = React.useTransition()
  const [removed, setRemoved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (removed) return null

  function remove() {
    startTransition(async () => {
      const res = await deleteAnswerAction(answer.id)
      if (res.ok) setRemoved(true)
      else setError(res.error)
    })
  }

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{answer.author}</span>
          <span className="text-xs text-muted-foreground">{answer.when}</span>
        </div>
        {answer.canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete answer"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-destructive disabled:opacity-50"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer.body}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </li>
  )
}
