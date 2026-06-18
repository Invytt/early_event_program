import "server-only"

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
      console.error("[email] send failed", res.status, await res.text().catch(() => ""))
    }
  } catch (e) {
    console.error("[email] send error", e)
  }
}

/* ---------- templates ---------- */

const wrap = (body: string) =>
  `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:auto;color:#1c1b19">${body}<hr style="border:none;border-top:1px solid #e6e4dd;margin:24px 0"/><p style="font-size:12px;color:#8a877f">Invytt · Early Event Program</p></div>`

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")

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
  eventName: string
  approved: boolean
}) {
  return sendEmail({
    to: args.to,
    subject: `${args.approved ? "You're in" : "Update"} — ${args.eventName}`,
    html: wrap(
      args.approved
        ? `<h2 style="margin:0 0 12px">You're approved 🎉</h2><p>The host approved your spot for <b>${args.eventName}</b>. You're confirmed!</p>`
        : `<h2 style="margin:0 0 12px">RSVP update</h2><p>Unfortunately your request for <b>${args.eventName}</b> wasn't approved this time.</p>`
    ),
  })
}

export function hostNewRsvpEmail(args: {
  to: Recipient
  eventName: string
  guestName: string
  pending: boolean
}) {
  return sendEmail({
    to: args.to,
    subject: `New ${args.pending ? "request" : "RSVP"} — ${args.eventName}`,
    html: wrap(
      `<h2 style="margin:0 0 12px">${args.guestName} ${args.pending ? "requested to join" : "is going"}</h2>
       <p><b>${args.eventName}</b>${args.pending ? " — review them in your approval queue." : ""}</p>`
    ),
  })
}
