import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { auth, clerkClient } from "@clerk/nextjs/server"
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  ShieldCheckIcon,
  EyeOffIcon,
} from "lucide-react"

import { PublicRsvp } from "@/components/public-rsvp"
import { getEventBySlug, getMyResponse } from "@/lib/db"
import {
  formatTime,
  coverGradient,
  parseFaqs,
  parseQuestionnaire,
} from "@/lib/events"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getEventBySlug(slug)
  if (!data) return { title: "Event not found" }
  const { event } = data
  const title = event.name
  // keep it generic — never leak a hidden location in shared previews
  const description = `You're invited — ${format(event.startsAt, "EEEE, MMMM d, yyyy")}.`
  // use the event cover when set, else fall back to the site banner
  const image = event.coverUrl || "/og-image.png"
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()
  const data = await getEventBySlug(slug, userId ?? undefined)
  if (!data) notFound()

  const { event, dto, counts, myStatus } = data
  const isHost = Boolean(userId) && userId === event.ownerId

  // resolve the host's real display name (public viewers shouldn't see "You")
  let hostName = "the host"
  try {
    const host = await (await clerkClient()).users.getUser(event.ownerId)
    hostName =
      [host.firstName, host.lastName].filter(Boolean).join(" ") ||
      host.username ||
      hostName
  } catch {
    /* host lookup failed — fall back to generic label */
  }
  const faqs = parseFaqs(event.faqs)
  const questions = parseQuestionnaire(event.questionnaire)
  // has this signed-in guest already answered? (host never answers their own)
  const alreadySubmitted =
    Boolean(userId) && !isHost && questions.length > 0
      ? Boolean(await getMyResponse(event.id, userId!))
      : false
  const dateLabel = format(event.startsAt, "EEEE, MMMM d, yyyy")
  const time = `${String(event.startsAt.getUTCHours()).padStart(2, "0")}:${String(
    event.startsAt.getUTCMinutes()
  ).padStart(2, "0")}`
  const locationVisible = !event.hideLocation || myStatus === "Going"
  const calUrl = gcalUrl(
    event.name,
    event.startsAt,
    event.description,
    locationVisible ? event.locationText : null
  )

  return (
    <div
      className="min-h-svh bg-[var(--paper)] py-10 text-foreground"
      style={{ background: "var(--paper)" }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5">
        {/* Brand */}
        <div className="logo">
          <Image src="/logo.png" alt="Invytt" width={401} height={170} className="logo-img" priority />
          <span className="scriptle">Enterprise</span>
        </div>

        {/* Cover */}
        <div
          className={`relative flex aspect-square w-full items-end overflow-hidden rounded-xl bg-gradient-to-br ${coverGradient(
            event.id
          )} p-5`}
        >
          {event.coverUrl && (
            <Image
              src={event.coverUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">Hosted by {hostName}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact icon={<CalendarIcon className="size-4" />} label={dateLabel} href={calUrl} />
          <Fact icon={<ClockIcon className="size-4" />} label={formatTime(time)} href={calUrl} />
          <Fact
            icon={<MapPinIcon className="size-4" />}
            label={
              locationVisible
                ? event.locationText || "No location"
                : "Location will be visible once you get approval"
            }
            href={
              locationVisible && event.locationText
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    event.locationText
                  )}`
                : undefined
            }
          />
          <Fact icon={<UsersIcon className="size-4" />} label={`${counts.going} going`} />
        </div>

        {event.description && (
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">About this event</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {event.description}
            </p>
          </section>
        )}

        {(event.requireApproval || event.hideLocation) && (
          <section className="flex flex-wrap gap-2">
            {event.requireApproval && (
              <Pill icon={<ShieldCheckIcon className="size-3.5" />} text="Approval required" />
            )}
            {event.hideLocation && (
              <Pill icon={<EyeOffIcon className="size-3.5" />} text="Location hidden until approval" />
            )}
          </section>
        )}

        <PublicRsvp
          eventId={event.id}
          slug={event.slug}
          initialStatus={myStatus}
          signedIn={Boolean(userId)}
          isHost={isHost}
          requireApproval={event.requireApproval}
          questions={questions}
          alreadyAnswered={alreadySubmitted}
        />

        {faqs.length > 0 && (
          <section className="flex flex-col gap-3 border-t border-border pt-6">
            <h2 className="font-semibold">FAQs</h2>
            <div className="flex flex-col gap-3">
              {faqs.map((f, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-[var(--paper-2)] p-4"
                >
                  <p className="text-sm font-medium">{f.q}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// build a Google Calendar "add event" URL (defaults to a 1-hour duration)
function gcalUrl(
  name: string,
  startsAt: Date,
  description?: string | null,
  location?: string | null
) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const end = new Date(startsAt.getTime() + 60 * 60 * 1000)
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: name,
    dates: `${fmt(startsAt)}/${fmt(end)}`,
  })
  if (description) p.set("details", description)
  if (location) p.set("location", location)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

function Fact({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode
  label: string
  href?: string
}) {
  const inner = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </>
  )
  const cls =
    "flex items-center gap-3 rounded-lg border border-border bg-[var(--paper-2)] px-4 py-3 text-sm"
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`group ${cls} transition-colors hover:bg-black/[0.03]`}>
        {inner}
      </a>
    )
  }
  return <div className={cls}>{inner}</div>
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
      {icon}
      {text}
    </span>
  )
}
