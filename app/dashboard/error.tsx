"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-[var(--paper-2)] p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          We hit an error loading this page. Try again — if it keeps happening, refresh.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
