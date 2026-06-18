import * as React from "react"

export type Segment = { label: string; value: number; color: string }

export function Donut({
  segments,
  centerLabel,
  centerSub,
}: {
  segments: Segment[]
  centerLabel?: string
  centerSub?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = 42
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-32 shrink-0 -rotate-90">
        {segments.map((s) => {
          const len = (s.value / total) * c
          const seg = (
            <circle
              key={s.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return seg
        })}
      </svg>
      <div className="flex flex-col gap-1.5">
        {centerLabel && (
          <div className="mb-1">
            <div className="text-2xl font-semibold tabular-nums">{centerLabel}</div>
            {centerSub && (
              <div className="text-xs text-muted-foreground">{centerSub}</div>
            )}
          </div>
        )}
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Bars({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-muted-foreground">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[var(--chart-3)]"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-right font-medium tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  )
}
