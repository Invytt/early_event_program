"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  createEventAction,
  updateEventAction,
  uploadCoverAction,
} from "@/app/actions/events"
import { generateEventDescription } from "@/app/actions/ai"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { LocationAutocomplete } from "@/components/location-autocomplete"
import { format } from "date-fns"
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  ShieldCheckIcon,
  EyeOffIcon,
  SparklesIcon,
} from "lucide-react"

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))

export type EventFormInitial = {
  id: string
  name: string
  description: string
  location: string
  placeId?: string
  lat?: number
  lng?: number
  capacity: string
  startsAt: string // ISO
  requireApproval: boolean
  hideLocation: boolean
  emailGuestRsvp: boolean
  emailHostRsvp: boolean
  emailDecision: boolean
  coverUrl?: string | null
}

// the calendar day the event is on, read in UTC (times are stored as UTC wall-clock)
function dateFromIso(iso?: string) {
  if (!iso) return undefined
  const d = new Date(iso)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function timeParts(iso?: string) {
  if (!iso) return { hour: "", minute: "", period: "" }
  const d = new Date(iso)
  // times are stored as wall-clock in UTC, so read them back in UTC
  const h24 = d.getUTCHours()
  const period = h24 >= 12 ? "PM" : "AM"
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return {
    hour: String(h12).padStart(2, "0"),
    minute: String(d.getUTCMinutes()).padStart(2, "0"),
    period,
  }
}

export function EventForm({
  mode,
  initial,
}: {
  mode: "create" | "edit"
  initial?: EventFormInitial
}) {
  const router = useRouter()
  const isEdit = mode === "edit"
  const init0 = React.useMemo(() => timeParts(initial?.startsAt), [initial?.startsAt])

  const [cover, setCover] = React.useState<string | null>(initial?.coverUrl ?? null)
  const [name, setName] = React.useState(initial?.name ?? "")
  const [description, setDescription] = React.useState(initial?.description ?? "")
  const [location, setLocation] = React.useState(initial?.location ?? "")
  const [place, setPlace] = React.useState<{ placeId?: string; lat?: number; lng?: number }>({
    placeId: initial?.placeId,
    lat: initial?.lat,
    lng: initial?.lng,
  })
  const [capacity, setCapacity] = React.useState(initial?.capacity ?? "")
  const [date, setDate] = React.useState<Date | undefined>(
    dateFromIso(initial?.startsAt)
  )
  const [hour, setHour] = React.useState(init0.hour)
  const [minute, setMinute] = React.useState(init0.minute)
  const [period, setPeriod] = React.useState(init0.period)
  const [requireApproval, setRequireApproval] = React.useState(initial?.requireApproval ?? false)
  const [hideLocation, setHideLocation] = React.useState(initial?.hideLocation ?? false)
  const [emailGuestRsvp, setEmailGuestRsvp] = React.useState(initial?.emailGuestRsvp ?? true)
  const [emailHostRsvp, setEmailHostRsvp] = React.useState(initial?.emailHostRsvp ?? true)
  const [emailDecision, setEmailDecision] = React.useState(initial?.emailDecision ?? true)
  const [coverPicked, setCoverPicked] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function fillWithAi() {
    if (!name.trim()) {
      setError("Add an event name before using AI.")
      return
    }
    setError(null)
    setAiLoading(true)
    const res = await generateEventDescription({
      name,
      location,
      dateLabel: date ? format(date, "EEE, MMM d") : undefined,
    })
    setAiLoading(false)
    if (res.ok) setDescription(res.text)
    else setError(res.error)
  }

  const timeLabel = hour && minute && period ? `${hour}:${minute} ${period}` : ""

  function time24() {
    if (!hour || !minute || !period) return null
    let h = parseInt(hour, 10) % 12
    if (period === "PM") h += 12
    return `${String(h).padStart(2, "0")}:${minute}`
  }

  function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setCover(URL.createObjectURL(file))
      setCoverPicked(true)
    }
  }

  // in edit mode, disable Save until something actually changes
  const dirty =
    !isEdit ||
    !initial ||
    coverPicked ||
    name !== initial.name ||
    description !== initial.description ||
    location !== initial.location ||
    (place.placeId ?? undefined) !== (initial.placeId ?? undefined) ||
    capacity !== initial.capacity ||
    hour !== init0.hour ||
    minute !== init0.minute ||
    period !== init0.period ||
    (date ? date.toDateString() : "") !==
      (dateFromIso(initial.startsAt)?.toDateString() ?? "") ||
    requireApproval !== initial.requireApproval ||
    hideLocation !== initial.hideLocation ||
    emailGuestRsvp !== initial.emailGuestRsvp ||
    emailHostRsvp !== initial.emailHostRsvp ||
    emailDecision !== initial.emailDecision

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // all fields are required
    const hasCover = Boolean(fileRef.current?.files?.[0]) || Boolean(initial?.coverUrl)
    if (!hasCover) return setError("Add a cover image.")
    if (!name.trim()) return setError("Event name is required.")
    if (!description.trim()) return setError("Add a description.")
    if (!location.trim()) return setError("Add a location.")
    if (!capacity || Number(capacity) < 1) return setError("Add a capacity.")
    if (!date) return setError("Pick a date for the event.")
    if (!hour || !minute || !period) return setError("Pick a time for the event.")

    const t = time24()
    // store the picked calendar day + wall-clock time as UTC, so it reads back
    // identically everywhere (display uses UTC) regardless of viewer timezone
    let h = 0
    let m = 0
    if (t) [h, m] = t.split(":").map(Number)
    const dt = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0)
    )

    setSubmitting(true)

    // upload cover only when a new file was chosen; otherwise keep the existing one
    let coverUrl: string | undefined = initial?.coverUrl ?? undefined
    const file = fileRef.current?.files?.[0]
    if (file) {
      const fd = new FormData()
      fd.append("cover", file)
      const up = await uploadCoverAction(fd)
      if (!up.ok) {
        setError(up.error)
        setSubmitting(false)
        return
      }
      coverUrl = up.url
    }

    if (!coverUrl) {
      setError("Add a cover image.")
      setSubmitting(false)
      return
    }

    const payload = {
      name,
      description,
      location,
      placeId: place.placeId,
      lat: place.lat,
      lng: place.lng,
      capacity: Number(capacity),
      requireApproval,
      hideLocation,
      emailGuestRsvp,
      emailHostRsvp,
      emailDecision,
      startsAt: dt.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      coverUrl,
    }

    const res = isEdit
      ? await updateEventAction({ ...payload, id: initial!.id })
      : await createEventAction(payload)

    if (res.ok) {
      router.push(`/dashboard/events/${res.id}`)
      router.refresh()
    } else {
      setError(res.error)
      setSubmitting(false)
    }
  }

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit event" : "Create Invite"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Update the details below. Your existing invite link stays the same."
            : "Set up a new event invite for your guests."}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        {/* Form */}
        <form onSubmit={onSubmit}>
          <Card className="bg-[var(--paper-2)]">
            <CardHeader>
              <CardTitle>Event details</CardTitle>
              <CardDescription>
                Fill in the information below to {isEdit ? "update" : "create"} the invite.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              {/* Event cover */}
              <div className="flex flex-col gap-2">
                <Label>Event cover</Label>
                <label
                  htmlFor="cover"
                  className="group relative flex aspect-[16/9] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background/40 transition-colors hover:bg-background/70"
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt="Event cover preview"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-6"
                      >
                        <path d="M21 15l-5-5L5 21M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <circle cx="9" cy="9" r="2" />
                      </svg>
                      Click to upload an image
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    id="cover"
                    name="cover"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={onCover}
                  />
                </label>
              </div>

              {/* Event name */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Event name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Summer Launch Party"
                  required
                />
              </div>

              {/* Event description */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Event description</Label>
                  <button
                    type="button"
                    onClick={fillWithAi}
                    disabled={aiLoading}
                    aria-label="Generate event description with AI"
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-50"
                  >
                    <SparklesIcon className="size-3.5" />
                    {aiLoading ? "Writing…" : "Fill with AI"}
                  </button>
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Tell guests what this event is about…"
                  required
                />
              </div>

              {/* Event location */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="location">Event location</Label>
                <LocationAutocomplete
                  id="location"
                  value={location}
                  onChange={setLocation}
                  onPlace={(p) =>
                    setPlace({ placeId: p.placeId, lat: p.lat, lng: p.lng })
                  }
                  placeholder="Search for a place…"
                  required
                />
              </div>

              {/* Capacity */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Max number of guests"
                  required
                />
              </div>

              {/* Date & time */}
              <div className="flex flex-col gap-2">
                <Label>Date &amp; time</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-9 flex-1 justify-start border-input bg-transparent font-normal hover:bg-accent/50 dark:bg-input/30 ${
                          date ? "" : "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="size-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
                    <Select value={hour} onValueChange={setHour}>
                      <SelectTrigger className="w-20" aria-label="Hour">
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {HOURS.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">:</span>
                    <Select value={minute} onValueChange={setMinute}>
                      <SelectTrigger className="w-20" aria-label="Minute">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {MINUTES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="w-[76px]" aria-label="AM/PM">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Event settings */}
              <div className="flex flex-col gap-4 border-t border-border pt-6">
                <div className="flex flex-col gap-1">
                  <Label>Event settings</Label>
                  <span className="text-sm text-muted-foreground">
                    Control how guests join this event.
                  </span>
                </div>
                <div className="flex flex-col gap-4 pl-4">
                <label
                  htmlFor="requireApproval"
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Require approval</span>
                    <span className="text-sm text-muted-foreground">
                      Manually approve each guest before they&apos;re confirmed.
                    </span>
                  </span>
                  <Switch
                    id="requireApproval"
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                  />
                </label>
                <label
                  htmlFor="hideLocation"
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      Hide location until approval
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Reveal the venue only after you approve a guest.
                    </span>
                  </span>
                  <Switch
                    id="hideLocation"
                    checked={hideLocation}
                    onCheckedChange={setHideLocation}
                  />
                </label>
                </div>
              </div>

              {/* Notification settings */}
              <div className="flex flex-col gap-4 border-t border-border pt-6">
                <div className="flex flex-col gap-1">
                  <Label>Notification settings</Label>
                  <span className="text-sm text-muted-foreground">
                    Choose which transactional emails get sent.
                  </span>
                </div>
                <div className="flex flex-col gap-4 pl-4">
                <label
                  htmlFor="emailGuestRsvp"
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Guest RSVP confirmation</span>
                    <span className="text-sm text-muted-foreground">
                      Email the guest when they RSVP.
                    </span>
                  </span>
                  <Switch
                    id="emailGuestRsvp"
                    checked={emailGuestRsvp}
                    onCheckedChange={setEmailGuestRsvp}
                  />
                </label>
                <label
                  htmlFor="emailHostRsvp"
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Host notification</span>
                    <span className="text-sm text-muted-foreground">
                      Email you when a guest RSVPs.
                    </span>
                  </span>
                  <Switch
                    id="emailHostRsvp"
                    checked={emailHostRsvp}
                    onCheckedChange={setEmailHostRsvp}
                  />
                </label>
                <label
                  htmlFor="emailDecision"
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Approval decision</span>
                    <span className="text-sm text-muted-foreground">
                      Email the guest when you approve or decline them.
                    </span>
                  </span>
                  <Switch
                    id="emailDecision"
                    checked={emailDecision}
                    onCheckedChange={setEmailDecision}
                  />
                </label>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex-col items-stretch gap-3">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !dirty}>
                  {submitting
                    ? isEdit
                      ? "Saving…"
                      : "Creating…"
                    : isEdit
                      ? "Save changes"
                      : "Create invite"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>

        {/* Live preview */}
        <div className="hidden xl:block">
          <div className="sticky top-8 flex flex-col gap-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Preview
            </p>
            <EventPreview
              cover={cover}
              name={name}
              description={description}
              location={location}
              capacity={capacity}
              dateLabel={date ? format(date, "EEEE, MMMM d, yyyy") : ""}
              timeLabel={timeLabel}
              requireApproval={requireApproval}
              hideLocation={hideLocation}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function EventPreview({
  cover,
  name,
  description,
  location,
  capacity,
  dateLabel,
  timeLabel,
  requireApproval,
  hideLocation,
}: {
  cover: string | null
  name: string
  description: string
  location: string
  capacity: string
  dateLabel: string
  timeLabel: string
  requireApproval: boolean
  hideLocation: boolean
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-[var(--paper-2)] p-5">
      {/* Cover */}
      <div className="relative flex h-40 w-full items-end overflow-hidden rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 p-4">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="relative rounded-full border border-white/40 bg-black/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          Invited
        </span>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {name || "Event name"}
        </h2>
        <p className="text-sm text-muted-foreground">Hosted by You</p>
      </div>

      {/* Facts */}
      <div className="flex flex-col gap-2">
        <PreviewFact
          icon={<CalendarIcon className="size-4" />}
          label={dateLabel || "Pick a date"}
          muted={!dateLabel}
        />
        <PreviewFact
          icon={<ClockIcon className="size-4" />}
          label={timeLabel || "Pick a time"}
          muted={!timeLabel}
        />
        <PreviewFact
          icon={<MapPinIcon className="size-4" />}
          label={
            hideLocation
              ? "Location revealed after approval"
              : location || "Event location"
          }
          muted={!hideLocation && !location}
        />
        <PreviewFact
          icon={<UsersIcon className="size-4" />}
          label={capacity ? `${capacity} spots` : "Unlimited capacity"}
          muted={!capacity}
        />
      </div>

      {/* About */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold">About this event</h3>
        <p
          className={`text-sm leading-relaxed ${
            description ? "text-muted-foreground" : "text-muted-foreground/60"
          }`}
        >
          {description || "Tell guests what this event is about…"}
        </p>
      </div>

      {/* Pills */}
      {(requireApproval || hideLocation) && (
        <div className="flex flex-wrap gap-2">
          {requireApproval && (
            <PreviewPill
              icon={<ShieldCheckIcon className="size-3.5" />}
              text="Approval required"
            />
          )}
          {hideLocation && (
            <PreviewPill
              icon={<EyeOffIcon className="size-3.5" />}
              text="Location hidden until approval"
            />
          )}
        </div>
      )}

      <Button className="w-full" disabled>
        Going
      </Button>
    </div>
  )
}

function PreviewFact({
  icon,
  label,
  muted,
}: {
  icon: React.ReactNode
  label: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className={muted ? "text-muted-foreground/60" : ""}>{label}</span>
    </div>
  )
}

function PreviewPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
      {icon}
      {text}
    </span>
  )
}
