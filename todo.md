# Deployment (Vercel + Supabase + Clerk)

## 1. Push code to Git

```bash
git add -A
git commit -m "Production-ready: hardening + prod env"
git push        # to GitHub/GitLab
```

`.env.local` / `.env.production` are gitignored — they will **NOT** be pushed. Good.

## 2. Set up Clerk production instance

Clerk test keys don't work in prod. In Clerk Dashboard:

1. Create/activate the Production instance for your app.
2. Add domain `events.invytt.com` (Clerk gives you DNS records — CNAMEs for `clerk.`, `accounts.`, etc.).
3. Copy the live keys: `pk_live_…` and `sk_live_…`.
4. Webhooks → add endpoint `https://events.invytt.com/api/webhooks/clerk`, subscribe to `user.deleted`, copy its signing secret (`whsec_…`).

## 3. Create the Vercel project

1. Vercel → New Project → import your Git repo.
2. Framework auto-detects Next.js. Build command `next build`, install `npm ci` — leave defaults. `postinstall` runs `prisma generate` automatically.
3. Don't deploy yet — set env vars first (step 4).

## 4. Add env vars in Vercel

Project → Settings → Environment Variables, scope **Production**.

Copy each from your `.env.production`, with the 4 prod-specific filled in:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase pooler `:6543?pgbouncer=true` |
| `DIRECT_URL` | Supabase `:5432` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | from `.env.production` |
| `NEXT_PUBLIC_APP_URL` | `https://events.invytt.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `whsec_…` (prod) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `..._SIGN_UP_...` | `/dashboard` |
| `ANTHROPIC_API_KEY`, `AUTOSEND_API_KEY`, `AUTOSEND_PROJECT_ID`, `AUTOSEND_TEMPLATE1/2/3_ID`, `EMAIL_FROM` | from `.env.production` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | from `.env.production` |

(You can `vercel env add` from CLI instead, or bulk-import.)

## 5. First deploy

Click Deploy (or push to your default branch). Watch the build log — should end `✓ Compiled successfully`.

## 6. Attach the domain

1. Vercel → Settings → Domains → add `events.invytt.com`.
2. Add the CNAME Vercel shows at your DNS provider: `events → cname.vercel-dns.com`.
3. Wait for TLS cert (auto). Confirm `https://events.invytt.com` loads.

## 7. Lock down Google Maps key

GCP Console → that API key → Application restrictions → HTTP referrers → add `https://events.invytt.com/*`.

## 8. Verify prod (smoke test)

1. Sign up via Clerk on the live site → lands on `/dashboard`.
2. Create an event (cover upload → Supabase Storage works).
3. Open `/e/<slug>` in another account → RSVP → check confirmation email link points to `events.invytt.com` (not localhost), and host gets the notification.
4. Approve/decline → guest gets decision email.
5. Share `/e/<slug>` link → preview shows event title + cover (OG metadata).
6. Delete a Clerk user in dashboard → confirm their events purge (webhook fired).

---

## Notes

- **DB:** currently your prod env reuses the same Supabase project as dev. Fine to launch, but if you want isolation, create a separate Supabase project, run `npx prisma db push` against its `DIRECT_URL`, and swap the two URLs. Schema is already synced on the current one — no migration step needed at deploy.
- **No migration in build:** schema lives in Supabase already; `prisma generate` (postinstall) only builds the client, no DB write at deploy.
- **CI:** `.github/workflows/test.yml` runs typecheck + 116 tests on push — green before merge.
- **Preview deploys (PRs)** will use test Clerk keys only if you scope those vars to Preview; otherwise set Preview env separately.

---

Want me to wire `vercel.ts` (project config) or a `vercel env` import script?
