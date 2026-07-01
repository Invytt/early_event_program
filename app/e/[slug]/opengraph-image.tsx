import { ImageResponse } from "next/og"

import { getEventBySlug } from "@/lib/db"

// Dynamic OG/Twitter image for the public event page. Renders the event cover
// full-bleed at a fixed 1200x630 — a proper, absolute, correctly-sized image
// that X/Twitter reliably accepts (raw arbitrary-size cover URLs get dropped).
export const alt = "Event invite"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getEventBySlug(slug)
  const cover = data?.event.coverUrl ?? null
  const name = data?.event.name ?? "You're invited"

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          background: "#1c1b19",
          alignItems: "flex-end",
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: "#efeee8",
              fontSize: 72,
              fontWeight: 700,
            }}
          >
            {name}
          </div>
        )}
      </div>
    ),
    size
  )
}
