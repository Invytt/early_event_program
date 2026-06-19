import Link from "next/link"
import { Button } from "@/components/ui/button"

// Shown for missing pages AND for resources the viewer isn't allowed to see —
// returning 404 (not 403) intentionally avoids revealing that an event exists.
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-[var(--paper)] p-6 text-center text-foreground">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          We couldn&apos;t find that
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page or event you&apos;re looking for doesn&apos;t exist, or you
          don&apos;t have access to it.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
