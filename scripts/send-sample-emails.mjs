// One-off: render the repo email templates with sample data and send all three
// to a test inbox via AutoSend's raw-HTML path (bypasses stored templateIds so
// we see exactly what's in emails/*.html). Uploads logo.png to the public
// `covers` bucket so the {{logo_url}} resolves to a reachable https URL.
import { readFile } from "node:fs/promises"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local", override: true })

const TO = "siddhantg2002@gmail.com"
const API = "https://api.autosend.com/v1/mails/send"
const key = process.env.AUTOSEND_API_KEY
const projectId = process.env.AUTOSEND_PROJECT_ID
const from = { email: process.env.EMAIL_FROM || "events@invytt.com", name: "Invytt" }
if (!key) {
  console.error("Missing AUTOSEND_API_KEY")
  process.exit(1)
}

// 1) upload logo to public storage → reachable URL for email clients
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const logoBytes = await readFile("public/logo-email.png")
const { error: upErr } = await sb.storage
  .from("covers")
  .upload("brand/logo-email.png", logoBytes, { contentType: "image/png", upsert: true })
if (upErr) {
  console.error("logo upload failed:", upErr.message)
  process.exit(1)
}
const { data: pub } = sb.storage.from("covers").getPublicUrl("brand/logo-email.png")
const logoUrl = pub.publicUrl
console.log("logo:", logoUrl)

const common = {
  logo_url: logoUrl,
  guest_name: "Siddhant",
  host_name: "Siddhant",
  event_name: "Summer Launch Party",
  when: "Fri, Jul 3 · 6:30 PM",
  cta_url: "https://invytt.com",
  unsubscribe: `mailto:${from.email}?subject=Unsubscribe`,
}

const jobs = [
  {
    file: "emails/rsvp_confirmation_by_host.html",
    data: {
      ...common,
      subject: "RSVP confirmation - Summer Launch Party",
      accent: "#15803d",
      status: "Approved · you’re going",
      note: "Good news — the host approved your request. You’re confirmed for the event below. See you there!",
      cta_label: "View your invite",
    },
  },
  {
    file: "emails/guest_rsvp_done.html",
    data: {
      ...common,
      subject: "Your RSVP has been registered - Summer Launch Party",
      accent: "#15803d",
    },
  },
  {
    file: "emails/host_rsvp_notification.html",
    data: {
      ...common,
      subject: "New RSVP - Summer Launch Party",
      accent: "#15803d",
      status: "Going",
      note: "Siddhant just RSVP’d to your event. You can see all responses in your dashboard.",
      cta_label: "Open dashboard",
    },
  },
]

function render(html, data) {
  return html
    .replace(/\{\{([a-z_]+)\}\}/g, (_, k) => data[k] ?? "")
}

const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
}
if (projectId) headers["x-project-id"] = projectId

for (const job of jobs) {
  const raw = await readFile(job.file, "utf8")
  const html = render(raw, job.data)
  const res = await fetch(API, {
    method: "POST",
    headers,
    body: JSON.stringify({ from, to: { email: TO }, subject: job.data.subject, html }),
  })
  const text = await res.text().catch(() => "")
  console.log(`${res.ok ? "✓ sent" : "✗ FAILED"} ${job.file} → ${res.status} ${res.ok ? "" : text}`)
}
console.log("done.")
