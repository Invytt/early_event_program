import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { isAdminEmail } from "@/lib/admin"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Admin-only platform: only the admin account may enter the dashboard.
  // (Guests can still sign in to RSVP on the public /e/[slug] pages.)
  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null
  if (!isAdminEmail(email)) redirect("/")

  return (
    <div className="flex min-h-svh flex-col bg-[var(--paper)] text-foreground md:flex-row">
      <DashboardSidebar />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}
