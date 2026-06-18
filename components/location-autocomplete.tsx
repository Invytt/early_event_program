"use client"

import * as React from "react"
import { MapPinIcon, MapIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any
  }
}

let bootstrapped = false
function loadMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  if (!API_KEY) return Promise.reject(new Error("missing api key"))
  if (!window.google?.maps?.importLibrary && !bootstrapped) {
    bootstrapped = true
    // Official Google Maps inline bootstrap loader — defines importLibrary synchronously.
    ;((g: any) => {
      let h: any
      const c = "google"
      const l = "importLibrary"
      const q = "__ib__"
      const m = document
      let b: any = window
      b = b[c] || (b[c] = {})
      const d = b.maps || (b.maps = {})
      const r = new Set<string>()
      const e = new URLSearchParams()
      const u = () =>
        h ||
        (h = new Promise<void>(async (f, n) => {
          const a = m.createElement("script")
          e.set("libraries", [...r] + "")
          for (const k in g)
            e.set(
              k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
              g[k]
            )
          e.set("callback", c + ".maps." + q)
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e
          d[q] = f
          a.onerror = () => (h = n(Error("Google Maps could not load.")))
          a.nonce = (m.querySelector("script[nonce]") as any)?.nonce || ""
          m.head.append(a)
        }))
      d[l]
        ? console.warn("Google Maps only loads once.")
        : (d[l] = (f: string, ...n: any[]) =>
            r.add(f) && u().then(() => d[l](f, ...n)))
    })({ key: API_KEY, v: "weekly" })
  }
  return Promise.resolve(window.google)
}

type Suggestion = { id: string; main: string; secondary: string; full: string }

export function LocationAutocomplete({
  id,
  value,
  onChange,
  onPlace,
  placeholder,
  required,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  onPlace?: (p: { placeId?: string; lat?: number; lng?: number; address: string }) => void
  placeholder?: string
  required?: boolean
}) {
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const tokenRef = React.useRef<any>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const boxRef = React.useRef<HTMLDivElement>(null)
  const justSelected = React.useRef(false)

  const [showMap, setShowMap] = React.useState(false)
  const mapDivRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<any>(null)
  const markerRef = React.useRef<any>(null)
  const geocoderRef = React.useRef<any>(null)
  const pendingRef = React.useRef<(() => void) | null>(null)

  // init the map when opened
  React.useEffect(() => {
    if (!showMap || !API_KEY) return
    let cancelled = false
    ;(async () => {
      try {
        const google = await loadMaps()
        const { Map } = await google.maps.importLibrary("maps")
        const { AdvancedMarkerElement } =
          await google.maps.importLibrary("marker")
        if (cancelled || !mapDivRef.current || mapRef.current) return
        geocoderRef.current = new google.maps.Geocoder()
        const map = new Map(mapDivRef.current, {
          center: { lat: 12.9716, lng: 77.5946 },
          zoom: 11,
          mapId: "DEMO_MAP_ID",
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        })
        mapRef.current = map
        // apply any location chosen from the dropdown before the map existed
        if (pendingRef.current) {
          pendingRef.current()
          pendingRef.current = null
        }
        map.addListener("click", async (e: any) => {
          const pos = e.latLng
          if (markerRef.current) markerRef.current.map = null
          markerRef.current = new AdvancedMarkerElement({ position: pos, map })
          try {
            const { results } = await geocoderRef.current.geocode({
              location: pos,
            })
            if (results?.[0]) {
              onChange(results[0].formatted_address)
              onPlace?.({
                lat: pos.lat(),
                lng: pos.lng(),
                address: results[0].formatted_address,
              })
            }
          } catch {
            /* ignore reverse-geocode failure */
          }
        })
      } catch (err) {
        console.error("[LocationAutocomplete] map error:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showMap, onChange])

  // close on outside click
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  async function fetchSuggestions(input: string) {
    if (!input.trim() || !API_KEY) {
      setSuggestions([])
      setOpen(false)
      return
    }
    try {
      const google = await loadMaps()
      const { AutocompleteSuggestion, AutocompleteSessionToken } =
        await google.maps.importLibrary("places")
      if (!tokenRef.current) tokenRef.current = new AutocompleteSessionToken()
      const { suggestions: res } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: tokenRef.current,
        })
      const mapped: Suggestion[] = (res ?? [])
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({
          id: s.placePrediction.placeId,
          main: s.placePrediction.mainText?.text ?? "",
          secondary: s.placePrediction.secondaryText?.text ?? "",
          full: s.placePrediction.text?.text ?? "",
        }))
      setSuggestions(mapped)
      setActive(-1)
      setOpen(mapped.length > 0)
    } catch (err) {
      console.error("[LocationAutocomplete] Places error:", err)
      setSuggestions([])
      setOpen(false)
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    justSelected.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250)
  }

  async function select(s: Suggestion) {
    justSelected.current = true
    onChange(s.full)
    setOpen(false)
    setSuggestions([])
    tokenRef.current = null // end the session after a selection
    if (!API_KEY) return
    try {
      const google = await loadMaps()
      const { Geocoder } = await google.maps.importLibrary("geocoding")
      const { AdvancedMarkerElement } =
        await google.maps.importLibrary("marker")
      const { results } = await new Geocoder().geocode({ placeId: s.id })
      const loc = results?.[0]?.geometry?.location
      if (!loc) return
      onPlace?.({ placeId: s.id, lat: loc.lat(), lng: loc.lng(), address: s.full })
      const apply = () => {
        const map = mapRef.current
        if (!map) return false
        map.setCenter(loc)
        map.setZoom(15)
        if (markerRef.current) markerRef.current.map = null
        markerRef.current = new AdvancedMarkerElement({ position: loc, map })
        return true
      }
      // don't auto-open the map; just sync if it's open, else apply when opened
      if (!apply()) pendingRef.current = apply
    } catch (err) {
      console.error("[LocationAutocomplete] sync to map failed:", err)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (a + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault()
      select(suggestions[active])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-white/30 bg-[var(--paper-2)]/70 py-1 shadow-lg backdrop-blur-xl">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(s)
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  i === active ? "bg-black/[0.05]" : ""
                }`}
              >
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="flex flex-col">
                  <span className="font-medium">{s.main}</span>
                  {s.secondary && (
                    <span className="text-xs text-muted-foreground">
                      {s.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {API_KEY && (
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <MapIcon className="size-3.5" />
          {showMap ? "Hide map" : "Choose on map"}
        </button>
      )}
      {showMap && (
        <div className="mt-2 flex flex-col gap-1">
          <div
            ref={mapDivRef}
            className="h-64 w-full overflow-hidden rounded-md border border-border"
          />
          <p className="text-xs text-muted-foreground">
            Click anywhere on the map to drop a pin and set the location.
          </p>
        </div>
      )}
    </div>
  )
}
