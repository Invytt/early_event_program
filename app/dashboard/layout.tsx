import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh bg-[var(--paper)] text-foreground">
      <DashboardSidebar />
      <main className="flex flex-1 flex-col gap-6 p-6 lg:p-8">{children}</main>
    </div>
  )
}
