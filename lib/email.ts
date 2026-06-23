import "server-only"

import { reportError } from "@/lib/observability"

const API = "https://api.autosend.com/v1/mails/send"

function from() {
  return { email: process.env.EMAIL_FROM || "events@invytt.com", name: "Invytt" }
}

export function emailConfigured() {
  return Boolean(process.env.AUTOSEND_API_KEY)
}

type Recipient = { email: string; name?: string }

// Fire-and-forget send; never throws (email failures must not break RSVP flow).
export async function sendEmail(opts: {
  to: Recipient
  subject: string
  html?: string
  templateId?: string
  dynamicData?: Record<string, string>
}): Promise<void> {
  const key = process.env.AUTOSEND_API_KEY
  if (!key) {
    console.warn("[email] AUTOSEND_API_KEY not set — skipping:", opts.subject)
    return
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  }
  // org-admin (ASA_) keys require the project id header
  const projectId = process.env.AUTOSEND_PROJECT_ID
  if (projectId) headers["x-project-id"] = projectId

  const body: Record<string, unknown> = {
    from: from(),
    to: opts.to,
    subject: opts.subject,
  }
  if (opts.templateId) {
    body.templateId = opts.templateId
    if (opts.dynamicData) body.dynamicData = opts.dynamicData
  } else {
    body.html = opts.html
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      reportError("email.send", `${res.status} ${await res.text().catch(() => "")}`)
    }
  } catch (e) {
    reportError("email.send", e)
  }
}

/* ---------- templates ---------- */

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL) {
  console.error(
    "[email] NEXT_PUBLIC_APP_URL is not set in production — email links will point to localhost."
  )
}
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
// absolute URL to the email header logo (served from /public). Emails need a
// fully-qualified https URL; override with EMAIL_LOGO_URL if hosted elsewhere.
const LOGO_URL = (process.env.EMAIL_LOGO_URL || `${APP_URL}/logo.png`).trim()

export function rsvpConfirmationEmail(args: {
  to: Recipient
  eventId: string
  eventName: string
  whenLabel: string
  pending: boolean
}) {
  const subject = `RSVP confirmation - ${args.eventName}`
  const templateId = (process.env.AUTOSEND_TEMPLATE1_ID || "").trim()
  if (!templateId) {
    console.warn("[email] AUTOSEND_TEMPLATE1_ID not set — skipping confirmation")
    return Promise.resolve()
  }
  return sendEmail({
    to: args.to,
    subject,
    templateId,
    dynamicData: {
      subject,
      logo_url: LOGO_URL,
      accent: "#15803d",
      heading: "Your RSVP has been registered",
      guest_name: args.to.name || "there",
      lead: "your response has been successfully captured.",
      event_name: args.eventName,
      when: args.whenLabel,
      cta_url: `${APP_URL}/dashboard/invites/${args.eventId}`,
      unsubscribe: `mailto:${process.env.EMAIL_FROM || "events@invytt.com"}?subject=Unsubscribe`,
    },
  })
}

export function approvalDecisionEmail(args: {
  to: Recipient
  guestName?: string
  eventId: string
  eventName: string
  whenLabel: string
  approved: boolean
}) {
  const subject = args.approved
    ? `You’re in - ${args.eventName}`
    : `Update on your RSVP - ${args.eventName}`
  const templateId = (process.env.AUTOSEND_TEMPLATE3_ID || "").trim()
  if (!templateId) {
    console.warn("[email] AUTOSEND_TEMPLATE3_ID not set — skipping decision email")
    return Promise.resolve()
  }
  return sendEmail({
    to: args.to,
    subject,
    templateId,
    dynamicData: {
      subject,
      logo_url: LOGO_URL,
      accent: args.approved ? "#15803d" : "#b91c1c",
      guest_name: args.guestName || args.to.name || "there",
      event_name: args.eventName,
      when: args.whenLabel,
      status: args.approved ? "Approved · you’re going" : "Not approved",
      note: args.approved
        ? "Good news — the host approved your request. You’re confirmed for the event below. See you there!"
        : "The host wasn’t able to approve your request for this event this time. Thanks for your interest.",
      cta_url: args.approved
        ? `${APP_URL}/dashboard/invites/${args.eventId}`
        : `${APP_URL}/dashboard/invites`,
      cta_label: args.approved ? "View your invite" : "Browse invites",
      unsubscribe: `mailto:${process.env.EMAIL_FROM || "events@invytt.com"}?subject=Unsubscribe`,
    },
  })
}

export function hostNewRsvpEmail(args: {
  to: Recipient
  hostName?: string
  eventId: string
  eventName: string
  guestName: string
  whenLabel: string
  pending: boolean
}) {
  const subject = `New ${args.pending ? "request" : "RSVP"} - ${args.eventName}`
  const templateId = (process.env.AUTOSEND_TEMPLATE2_ID || "").trim()
  if (!templateId) {
    console.warn("[email] AUTOSEND_TEMPLATE2_ID not set — skipping host notification")
    return Promise.resolve()
  }
  return sendEmail({
    to: args.to,
    subject,
    templateId,
    dynamicData: {
      subject,
      logo_url: LOGO_URL,
      accent: args.pending ? "#b45309" : "#15803d",
      host_name: args.hostName || "there",
      guest_name: args.guestName,
      event_name: args.eventName,
      when: args.whenLabel,
      status: args.pending ? "Pending approval" : "Going",
      note: args.pending
        ? `${args.guestName} has requested to join your event and needs your approval. Open the approval queue to approve or decline.`
        : `${args.guestName} just RSVP’d to your event. You can see all responses in your dashboard.`,
      // approval-needed → straight to the event's approval queue; otherwise the dashboard
      cta_url: args.pending
        ? `${APP_URL}/dashboard/events/${args.eventId}`
        : `${APP_URL}/dashboard`,
      cta_label: args.pending ? "Review request" : "Open dashboard",
      unsubscribe: `mailto:${process.env.EMAIL_FROM || "events@invytt.com"}?subject=Unsubscribe`,
    },
  })
}
