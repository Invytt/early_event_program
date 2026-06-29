// One-off: send the invite via the AutoSend TEMPLATE (templateId + dynamicData),
// exactly as eventInviteEmail does in production. Uses real Diwali Party data.
import { config } from "dotenv"

config({ path: ".env.local", override: true })

const TO = "siddhantg2002@gmail.com"
const API = "https://api.autosend.com/v1/mails/send"
const key = process.env.AUTOSEND_API_KEY
const projectId = process.env.AUTOSEND_PROJECT_ID
const templateId = (process.env.AUTOSEND_TEMPLATE4_ID || "").trim()
const from = { email: process.env.EMAIL_FROM || "events@invytt.com", name: "Invytt" }
if (!key) { console.error("Missing AUTOSEND_API_KEY"); process.exit(1) }
if (!templateId) { console.error("Missing AUTOSEND_TEMPLATE4_ID"); process.exit(1) }

const subject = "You’re invited - Diwali Party"
const dynamicData = {
  subject,
  accent: "#15803d",
  logo_url:
    "https://rqzamrutxuzvmxuoopjg.supabase.co/storage/v1/object/public/covers/brand/logo-email.png",
  event_cover:
    "https://rqzamrutxuzvmxuoopjg.supabase.co/storage/v1/object/public/covers/aca74725-28b5-4a71-a00e-bb23abe83162.jpg",
  event_name: "Diwali Party",
  when: "Wed, Jul 1 · 3:15 PM",
  location: "Revealed once the host approves you",
  note: "You've been invited to the event above. Tap below to view the details and RSVP.",
  cta_url: "https://invytt.com/e/diwali-party-99j1",
  cta_label: "View invite & RSVP",
}

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
if (projectId) headers["x-project-id"] = projectId

const res = await fetch(API, {
  method: "POST",
  headers,
  body: JSON.stringify({ from, to: { email: TO }, subject, templateId, dynamicData }),
})
console.log(
  `${res.ok ? "✓ sent" : "✗ FAILED"} template ${templateId} → ${res.status} ${
    res.ok ? "" : await res.text().catch(() => "")
  }`
)
