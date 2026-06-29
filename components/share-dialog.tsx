"use client"

import * as React from "react"
import { Share2Icon, LinkIcon, MailIcon, CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { sendEventInviteAction } from "@/app/actions/events"

export function ShareDialog({
  eventId,
  slug,
}: {
  eventId: string
  slug: string
}) {
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState(`/e/${slug}`)
  const [copied, setCopied] = React.useState(false)
  const [emails, setEmails] = React.useState("")
  const [sending, startTransition] = React.useTransition()
  const [sentMsg, setSentMsg] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // resolve the absolute URL on the client (origin isn't known on the server)
  React.useEffect(() => {
    if (typeof window !== "undefined") setUrl(`${window.location.origin}/e/${slug}`)
  }, [slug])

  // reset transient state whenever the dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setCopied(false)
      setSentMsg(null)
      setError(null)
      setEmails("")
    }
  }, [open])

  function copy() {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // split on commas, semicolons, whitespace and newlines
  const parsed = emails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)

  function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSentMsg(null)
    if (parsed.length === 0) return setError("Add at least one email")
    startTransition(async () => {
      const res = await sendEventInviteAction(eventId, parsed)
      if (res.ok) {
        const skipped = res.invalid.length
        setSentMsg(
          `Sent ${res.sent} invite${res.sent === 1 ? "" : "s"}` +
            (skipped ? ` · skipped ${skipped} invalid` : "")
        )
        setEmails("")
      } else setError(res.error)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1.5">
          <Share2Icon className="size-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share event</DialogTitle>
          <DialogDescription>
            Copy the invite link or email it directly to a guest.
          </DialogDescription>
        </DialogHeader>

        {/* Copy link */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <LinkIcon className="size-3.5" />
            Invite link
          </Label>
          <div className="flex gap-2">
            <Input readOnly value={url} className="flex-1" onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" className="shrink-0" onClick={copy}>
              {copied ? (
                <>
                  <CheckIcon className="size-4" /> Copied
                </>
              ) : (
                "Copy"
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Send email */}
        <form className="flex flex-col gap-2" onSubmit={send}>
          <Label htmlFor="invite-emails" className="flex items-center gap-1.5 text-sm font-medium">
            <MailIcon className="size-3.5" />
            Send via email
          </Label>
          <Textarea
            id="invite-emails"
            rows={3}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="guest1@example.com, guest2@example.com…"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {parsed.length > 0
                ? `${parsed.length} recipient${parsed.length === 1 ? "" : "s"}`
                : "Separate multiple emails with commas or new lines"}
            </span>
            <Button type="submit" className="shrink-0" disabled={sending || parsed.length === 0}>
              {sending
                ? "Sending…"
                : `Send${parsed.length > 1 ? ` (${parsed.length})` : ""}`}
            </Button>
          </div>
          {sentMsg && <p className="text-sm text-green-700">{sentMsg} ✓</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
