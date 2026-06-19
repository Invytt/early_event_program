import type { NextRequest } from "next/server"
import { verifyWebhook } from "@clerk/nextjs/webhooks"

import { purgeUser } from "@/lib/db"
import { reportError } from "@/lib/observability"

// Clerk webhook endpoint. Configure in Clerk Dashboard → Webhooks, subscribe to
// `user.deleted`, and set CLERK_WEBHOOK_SIGNING_SECRET. Signature is verified by
// verifyWebhook; this route is intentionally public (not behind the auth gate).
export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (e) {
    // bad/missing signature — not retryable, don't ask Clerk to resend
    reportError("clerk.webhook.verify", e)
    return new Response("invalid signature", { status: 400 })
  }

  try {
    if (evt.type === "user.deleted" && evt.data.id) {
      await purgeUser(evt.data.id)
    }
    return new Response("ok", { status: 200 })
  } catch (e) {
    // transient (e.g. DB) — 500 so Clerk retries with backoff
    reportError("clerk.webhook.process", e)
    return new Response("processing error", { status: 500 })
  }
}
