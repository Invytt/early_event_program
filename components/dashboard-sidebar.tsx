"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { PanelLeftIcon } from "lucide-react"

type IconProps = React.SVGProps<SVGSVGElement>
const I = ({ d, ...p }: IconProps & { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4 shrink-0"
    {...p}
  >
    <path d={d} />
  </svg>
)

const icons = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  mailPlus:
    "M3 8l9 6 5.5-3.67M21 9V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7M18 15v6M15 18h6",
  inbox: "M4 4h16v16H4zM3 13h5l2 3h4l2-3h5",
  ticket:
    "M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1a2 2 0 0 0 0 4v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1a2 2 0 0 0 0-4zM13 5v14",
}

const nav = [
  { label: "Dashboard", href: "/dashboard", d: icons.grid },
  { label: "Create Invite", href: "/dashboard/create-invite", d: icons.mailPlus },
  { label: "Your Invitations", href: "/dashboard/my-invitations", d: icons.ticket },
  { label: "Invites", href: "/dashboard/invites", d: icons.inbox },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(true)

  return (
    <aside
      className={`sticky top-0 hidden h-svh shrink-0 flex-col gap-4 border-r border-border bg-[var(--paper-2)] p-3 transition-[width] duration-200 md:flex ${
        open ? "w-60" : "w-[68px]"
      }`}
    >
      {/* Header: logo + toggle */}
      <div className="flex items-center justify-between gap-2">
        {open && (
          <div className="logo px-2 py-1.5">
            Invytt
            <br />
            <span className="scriptle">Early Event Program</span>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          className={`flex size-9 shrink-0 items-center justify-center rounded-md text-foreground/70 hover:bg-black/5 ${
            open ? "" : "mx-auto"
          }`}
        >
          <PanelLeftIcon className="size-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const active =
            n.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(n.href)
          return (
            <Link
              key={n.label}
              href={n.href}
              title={open ? undefined : n.label}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                open ? "" : "justify-center"
              } ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/75 hover:bg-black/5"
              }`}
            >
              <I d={n.d} />
              {open && n.label}
            </Link>
          )
        })}
      </nav>

      <div
        className={`mt-auto flex items-center gap-3 rounded-md px-3 py-2 ${
          open ? "" : "justify-center"
        }`}
      >
        <UserButton showName={open} />
      </div>
    </aside>
  )
}
