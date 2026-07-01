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

// minimal HTML escaping for values interpolated into inline email markup
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

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
  slug: string
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
      cta_url: `${APP_URL}/e/${args.slug}`,
      unsubscribe: `mailto:${process.env.EMAIL_FROM || "events@invytt.com"}?subject=Unsubscribe`,
    },
  })
}

export function approvalDecisionEmail(args: {
  to: Recipient
  guestName?: string
  slug: string
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
      cta_url: `${APP_URL}/e/${args.slug}`,
      cta_label: args.approved ? "View event" : "View event",
      unsubscribe: `mailto:${process.env.EMAIL_FROM || "events@invytt.com"}?subject=Unsubscribe`,
    },
  })
}

// Host-initiated invite: sends the shareable /e/[slug] link to one recipient.
// Uses the inline-HTML path (no AutoSend template needed) so it works as soon
// as AUTOSEND_API_KEY is set.
export function eventInviteEmail(args: {
  to: Recipient
  eventName: string
  whenLabel: string
  location?: string | null
  coverUrl?: string | null
  url: string
}) {
  const subject = `You’re invited - ${args.eventName}`

  // Preferred path: AutoSend stored template (emails/invitation.html). Set
  // AUTOSEND_TEMPLATE4_ID to use it — keys below map to the {{...}} vars.
  const templateId = (process.env.AUTOSEND_TEMPLATE4_ID || "").trim()
  if (templateId) {
    return sendEmail({
      to: args.to,
      subject,
      templateId,
      dynamicData: {
        subject,
        accent: "#15803d",
        logo_url: LOGO_URL,
        event_cover: args.coverUrl || "",
        event_name: args.eventName,
        when: args.whenLabel,
        location: args.location?.trim() || "See invite for details",
        note: "You've been invited to the event above. Tap below to view the details and RSVP.",
        cta_url: args.url,
        cta_label: "View invite & RSVP",
      },
    })
  }

  // Fallback: inline HTML (works without a configured template).
  const safeName = escapeHtml(args.eventName)
  const safeWhen = escapeHtml(args.whenLabel)
  const safeLocation = escapeHtml(args.location?.trim() || "See invite for details")
  const safeUrl = escapeHtml(args.url)
  // cover is optional — events normally have one, but degrade gracefully if not
  const coverRow = args.coverUrl
    ? `<tr><td style="padding: 24px 32px 0 32px"><img src="${escapeHtml(
        args.coverUrl
      )}" alt="${safeName}" width="416" style="display: block; width: 100%; max-width: 416px; height: auto; border: 0; outline: none; text-decoration: none; border-radius: 10px;" /></td></tr>`
    : ""
  const html = `<!doctype html>
<html dir="ltr" lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #ecebe6">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ecebe6">
      <tbody>
        <tr>
          <td align="center" style="padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 480px; background-color: #e6e4dd; border: 1px solid #d9d6cd; border-radius: 14px; overflow: hidden;">
              <tbody>
                <tr><td style="height: 6px; background-color: #15803d; line-height: 6px; font-size: 0">&nbsp;</td></tr>
                <tr><td style="padding: 28px 32px 0 32px"><img src="${LOGO_URL}" alt="Invytt" width="120" style="display: block; width: 120px; height: auto; border: 0; outline: none; text-decoration: none;" /></td></tr>
                ${coverRow}
                <tr>
                  <td style="padding: 24px 32px 0 32px">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #efeee8; border: 1px solid #d9d6cd; border-radius: 10px;">
                      <tbody><tr><td style="padding: 16px 18px">
                        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #8a877f;">Event</div>
                        <div style="font-size: 16px; font-weight: 600; color: #1c1b19; margin-top: 2px;">${safeName}</div>
                        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #8a877f; margin-top: 12px;">When</div>
                        <div style="font-size: 15px; color: #1c1b19; margin-top: 2px;">${safeWhen}</div>
                        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #8a877f; margin-top: 12px;">Where</div>
                        <div style="font-size: 15px; color: #1c1b19; margin-top: 2px;">${safeLocation}</div>
                      </td></tr></tbody>
                    </table>
                  </td>
                </tr>
                <tr><td style="padding: 24px 32px 0 32px"><h1 style="margin: 0; font-size: 22px; line-height: 1.25; color: #1c1b19;">You're invited</h1></td></tr>
                <tr><td style="padding: 16px 32px 0 32px"><p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b6862;">You've been invited to the event above. Tap below to view the details and RSVP.</p></td></tr>
                <tr><td style="padding: 20px 32px 0 32px"><a href="${safeUrl}" rel="noopener noreferrer" style="display: inline-block; background-color: #1c1b19; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: 8px;">View invite &amp; RSVP</a></td></tr>
                <tr>
                  <td style="padding: 24px 32px 28px 32px">
                    <hr style="border: none; border-top: 1px solid #d9d6cd; margin: 0 0 14px 0;" />
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a6a09b;"><a href="https://invytt.com" rel="noopener noreferrer" style="color: #a6a09b; text-decoration: none">Invytt</a> · Enterprise</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`
  return sendEmail({ to: args.to, subject, html })
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
