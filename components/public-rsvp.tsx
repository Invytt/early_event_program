"use client"

import * as React from "react"
import { SignUpButton } from "@clerk/nextjs"
import { CheckCircle2Icon, ClockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { rsvpAction } from "@/app/actions/events"
import type { RsvpStatus } from "@/lib/events"

export function PublicRsvp({
  eventId,
  slug,
  initialStatus,
  signedIn,
  isHost,
  requireApproval,
}: {
  eventId: string
  slug: string
  initialStatus: RsvpStatus | null
  signedIn: boolean
  isHost: boolean
  requireApproval: boolean
}) {
  const [status, setStatus] = React.useState<RsvpStatus | null>(initialStatus)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function respond(going: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await rsvpAction(eventId, going)
      if (res.ok) setStatus(res.status)
      else setError(res.error)
    })
  }

  const box = "rounded-xl border border-border bg-[var(--paper-2)] p-5"

  // Host viewing their own event
  if (isHost) {
    return (
      <div className={`${box} border-t border-border`}>
        <p className="text-sm text-muted-foreground">
          You&apos;re the host of this event. Share the link above so guests can RSVP.
        </p>
      </div>
    )
  }

  // Not signed in
  if (!signedIn) {
    return (
      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">Sign in to RSVP to this event.</p>
        <SignUpButton
          mode="modal"
          forceRedirectUrl={`/e/${slug}`}
          signInForceRedirectUrl={`/e/${slug}`}
        >
          <Button className="w-fit">Sign in to RSVP</Button>
        </SignUpButton>
      </div>
    )
  }

  // Already responded → blocked, show outcome
  if (status === "Going") {
    return (
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-3 rounded-xl border border-green-600/30 bg-green-500/10 p-4 text-green-800">
          <CheckCircle2Icon className="size-5 shrink-0" />
          <div>
            <p className="font-medium">You&apos;re in — welcome! 🎉</p>
            <p className="text-sm text-green-800/80">See you at the event.</p>
          </div>
        </div>
      </div>
    )
  }
  if (status === "Pending") {
    return (
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-3 rounded-xl border border-amber-600/30 bg-amber-500/10 p-4 text-amber-800">
          <ClockIcon className="size-5 shrink-0" />
          <div>
            <p className="font-medium">Request sent</p>
            <p className="text-sm text-amber-800/80">
              You&apos;ll be in once the host approves your request.
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (status === "Waitlist") {
    return (
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-3 rounded-xl border border-blue-600/30 bg-blue-500/10 p-4 text-blue-800">
          <ClockIcon className="size-5 shrink-0" />
          <div>
            <p className="font-medium">You&apos;re on the waitlist</p>
            <p className="text-sm text-blue-800/80">
              This event is at capacity — we&apos;ll move you in if a spot opens up.
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (status === "Declined") {
    return (
      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          You marked that you can&apos;t go to this event.
        </p>
      </div>
    )
  }

  // Fresh — show RSVP buttons
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-6">
      <div className="flex gap-2">
        <Button
          className="flex-1 sm:flex-none"
          disabled={pending}
          onClick={() => respond(true)}
        >
          {pending ? "…" : "Going"}
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          disabled={pending}
          onClick={() => respond(false)}
        >
          Can&apos;t go
        </Button>
      </div>
      {requireApproval && (
        <p className="text-xs text-muted-foreground">
          This event requires host approval — you&apos;ll be confirmed once approved.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
