# Invytt — Enterprise

Event invitation & RSVP platform. Hosts create event invites, share them, and track
RSVPs from a dashboard with charts. Built on the Next.js App Router.

## Tech stack

| Layer      | Tech                                                             |
| ---------- | --------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org) (App Router, Turbopack), React 19 |
| Language   | TypeScript                                                      |
| Auth       | [Clerk](https://clerk.com) — route protection via `proxy.ts`    |
| Database   | PostgreSQL (Supabase pooler) via [Prisma 7](https://prisma.io)  |
| UI         | [shadcn/ui](https://ui.shadcn.com) (new-york), Tailwind CSS v4, lucide icons |
| Charts     | [Recharts](https://recharts.org)                                |
| Maps       | Google Maps Platform — Places Autocomplete, Geocoding, Dynamic Maps |

## Project layout

```
app/
  page.tsx                      landing page (Clerk sign-up)
  dashboard/                    protected area (Clerk-guarded)
    page.tsx                    dashboard home
    create-invite/              event creation form
    events/[id]/                event detail + RSVP analytics
    invites/                    invite list + detail
    my-invitations/             invites received
components/
  ui/                           shadcn/ui primitives
  location-autocomplete.tsx     Google Maps Places + map picker
  event-dashboard.tsx, charts.tsx, rsvp-chart.tsx, ...
lib/
  events.ts                     event types + seed data
  utils.ts                      cn() helper
hooks/                          use-mobile, etc.
prisma/
  schema.prisma                 Event + Rsvp models
proxy.ts                        Clerk middleware (protects /dashboard)
```

## Data model

- **Event** — host-owned (`ownerId` = Clerk user id), unique `slug`, optional location
  (`locationText` / `placeId` / `lat` / `lng`), `startsAt`, capacity, approval & hide-location flags.
- **Rsvp** — belongs to an Event, status `Going | Pending | Declined | Waitlist`,
  unique per `(eventId, userId)`. Cascades on event delete.

See `prisma/schema.prisma`.

## Setup

Requires Node 18+ (developed on Node 26).

```bash
# 1. install deps
npm install

# 2. configure env
cp .env.example .env.local
#    fill in Clerk keys, Google Maps key, Postgres URLs

# 3. set up the database
npx prisma generate
npx prisma migrate dev      # or: npx prisma db push

# 4. run
npm run dev                 # http://localhost:3000
```

## Environment variables

All keys live in `.env.local` (git-ignored). Copy `.env.example` and fill in:

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth |
| `NEXT_PUBLIC_CLERK_SIGN_IN/UP_FALLBACK_REDIRECT_URL` | post-auth redirects |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JS / Places / Geocoding (browser key) |
| `DATABASE_URL` | Postgres app connection (transaction pooler, IPv4) |
| `DIRECT_URL` | Postgres direct connection (for Prisma migrations) |

## Scripts

| Command | Action |
| ------- | ------ |
| `npm run dev`   | dev server (Turbopack) |
| `npm run build` | production build |
| `npm run start` | serve production build |
| `npm run lint`  | next lint |

## Security notes

- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ships to the browser.** Before production, restrict
  it in Google Cloud Console by **HTTP referrer** (your domain) and an **API allowlist**
  (Maps JavaScript API, Places API New, Geocoding API). Set a billing budget + quota caps.
- Routes under `/dashboard` are protected by Clerk middleware in `proxy.ts`.
- Never commit `.env.local` — it is git-ignored; share config via `.env.example`.

## Google Maps cost

Three billable SKUs are used in `components/location-autocomplete.tsx`:
Places Autocomplete (per keystroke, debounced — the main driver), Dynamic Map load
(only when the map picker is opened), and reverse Geocoding (on map pin clicks).
Google free tier is ~10,000 calls/month per SKU. To cut cost: raise the autocomplete
debounce / minimum characters, or finish each session with a Place Details call so
session-token billing applies.
