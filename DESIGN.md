# Invytt — Design System

Design tokens and component conventions for the Invytt Enterprise frontend.
Source of truth: `app/globals.css` (tokens), `app/layout.tsx` (fonts), `lib/events.ts` (gradients), shadcn/ui in `components/ui/`.

---

## Brand

| Asset | File | Notes |
|-------|------|-------|
| Wordmark logo | `public/logo.png` | Darkened chrome "invytt", transparent bg (401×170) |
| SEO / icon / OG logo | `public/logo-black.png` | Square 500×500, used for favicon + structured data |
| Social banner | `public/og-image.png` | 1200×630, `summary_large_image` card |
| Hero video | `public/vid1.mp4` | 600px, muted loop (re-encoded for weight) |

Tagline: **Enterprise** · **Enterprise**

---

## Color

Two palettes coexist: a warm **paper** theme for the landing + marketing surfaces, and a neutral **oklch** theme (shadcn/ui) for the dashboard/app.

### Paper theme (landing, brand surfaces)
| Token | Value | Use |
|-------|-------|-----|
| `--paper` | `#ecebe6` | Page background (with faint vertical paper texture) |
| `--paper-2` | `#e6e4dd` | Cards, panels, raised surfaces |
| `--ink` | `#1c1b19` | Primary text |
| `--ink-muted` | `#4a4843` | Secondary text |

### App theme (shadcn/ui, oklch — light mode)
| Token | Value | Use |
|-------|-------|-----|
| `--background` | `oklch(1 0 0)` | App background |
| `--foreground` | `oklch(0.145 0 0)` | Text |
| `--card` / `--popover` | `oklch(1 0 0)` | Surfaces |
| `--primary` | `oklch(0.205 0 0)` | Primary buttons (near-black) |
| `--primary-foreground` | `oklch(0.985 0 0)` | On-primary text |
| `--secondary` / `--accent` / `--muted` | `oklch(0.97 0 0)` | Subtle fills |
| `--muted-foreground` | `oklch(0.556 0 0)` | Muted text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Errors, delete |
| `--border` / `--input` | `oklch(0.922 0 0)` | Borders, inputs |
| `--ring` | `oklch(0.708 0 0)` | Focus ring |

Sidebar mirrors the same scale via `--sidebar-*` tokens.

### Accent
| Color | Hex | Use |
|-------|-----|-----|
| Deep red | `#800e13` | Optional emphasis (used in nav experiments) |
| Black | `#000` / `#212529` | Nav / dark surfaces |

### Status colors (RSVP)
| Status | Classes |
|--------|---------|
| Going | `bg-green-500/15 text-green-700 border-green-600/30` |
| Pending | `bg-amber-500/15 text-amber-700 border-amber-600/30` |
| Declined | `bg-rose-500/15 text-rose-700 border-rose-600/30` |

Activity dots: Going `bg-green-500`, Pending `bg-amber-500`, Declined `bg-rose-500`.

### Chart colors
- Donut segments: Going `oklch(0.7 0.15 150)`, Pending `oklch(0.75 0.15 80)`, Declined `oklch(0.65 0.2 20)`.
- Line/bar series: `--chart-3` (`oklch(0.439 0 0)`).
- Grayscale chart ramp: `--chart-1..5` (`0.87` → `0.269` lightness).

### Cover gradients (`lib/events.ts`, deterministic by event id)
```
from-amber-400 to-rose-500
from-indigo-500 to-violet-600
from-emerald-400 to-teal-600
from-sky-400 to-blue-600
from-fuchsia-500 to-pink-600
from-lime-400 to-green-600
```

---

## Typography

Loaded via `next/font/google` in `app/layout.tsx`, exposed as CSS variables.

| Role | Family | Variable | Weights |
|------|--------|----------|---------|
| Sans / UI (default) | **Geist** | `--font-sans` | variable |
| Heading | Geist | `--font-heading` | → maps to `--font-sans` |
| Serif / display | **Playfair Display** | `--font-serif` | 400, 700, 900 |
| Script / accent | **Dancing Script** | `--font-script` | 400, 700 |
| Mono / landing body | **Space Mono** | `--font-mono` | 400, 700 |

### Landing type scale
| Class | Family | Size | Notes |
|-------|--------|------|-------|
| `.logo` | serif | 17px, 700, uppercase | wordmark text fallback |
| `.logo .scriptle` | script | 20px, 700, lowercase | "enterprise" |
| `.title` | serif | `clamp(72px, 15vw, 168px)`, line-height 0.72 | hero |
| `.title .scriptle` | script | 0.62em | hero accent |
| `.nav` | mono | 12px, letter-spacing 0.06em, uppercase | nav links |

App UI uses Tailwind defaults (`text-sm`, `text-2xl font-semibold tracking-tight` for page titles).

---

## Radius

Base `--radius: 0.625rem` (10px). shadcn scale:
| Token | Value |
|-------|-------|
| `--radius-sm` | `radius × 0.6` |
| `--radius-md` | `radius × 0.8` |
| `--radius-lg` | `radius` |
| `--radius-xl` | `radius × 1.4` |
| `--radius-2xl` | `radius × 1.8` |
| `--radius-3xl` | `radius × 2.2` |
| `--radius-4xl` | `radius × 2.6` |

Common app usage: cards `rounded-xl`, pills/badges `rounded-full`, buttons/inputs `rounded-md`/`rounded-lg`.

---

## Surfaces & effects

- **Cards/panels:** `border border-border bg-[var(--paper-2)]` + `rounded-xl`, padding `p-5`.
- **Paper texture:** body has a faint 3px repeating vertical line gradient (`rgba(0,0,0,0.022)`).
- **Hover lift:** `transition-shadow group-hover:shadow-md`.
- **TV mock (landing):** gradient `linear-gradient(160deg,#4a3f35,#2c241d)`, `box-shadow: 0 24px 40px -18px rgba(0,0,0,.45)`, plus CRT scanlines/grain/glare overlays.

---

## Components (shadcn/ui)

Located in `components/ui/`. In use: `button`, `card`, `input`, `label`, `textarea`, `switch`, `select`, `popover`, `calendar`, `alert-dialog`, `chart` (recharts wrapper).

Custom: `charts.tsx` (SVG `Donut` + `Bars`), `rsvp-chart.tsx` (lazy recharts line chart), `events-grid`, `event-dashboard`, `event-form`, `dashboard-sidebar`, `location-autocomplete`, `attendees-popover`, `public-rsvp`.

### Button variants
`default` (primary near-black), `secondary`, `outline`, `destructive`. Sizes `sm` / default. Icons via lucide-react (`size-4`).

### Layout
- Landing: `.page` centered `max-width: 1100px`, padding `28px 40px 36px`.
- Dashboard: sidebar (`w-60` open / `w-[68px]` collapsed) + content; mobile drawer.

---

## Iconography

[lucide-react](https://lucide.dev) throughout. Standard size `size-4` (16px), small `size-3.5`.

---

## Misc

- **Theme color (PWA):** `#000000` (`viewport.themeColor`).
- **Locale:** `en_IN`.
- **Font smoothing:** `-webkit-font-smoothing: antialiased`.
