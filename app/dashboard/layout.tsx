import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[var(--paper)] text-foreground md:flex-row">
      <DashboardSidebar />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}
