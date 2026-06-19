export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-black/5" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-[var(--paper-2)]"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-border bg-[var(--paper-2)]" />
    </div>
  )
}
