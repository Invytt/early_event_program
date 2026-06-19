"use client"

import * as React from "react"
import { ChevronDownIcon, UsersIcon } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const PALETTE = [
  "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-emerald-500",
  "bg-sky-500", "bg-violet-500", "bg-teal-500",
]
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("")

export function AttendeesPopover({ names }: { names: string[] }) {
  const count = names.length
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`View ${count} going`}
        className="group flex w-full items-center gap-3 rounded-lg border border-border bg-[var(--paper-2)] px-4 py-3 text-left text-sm transition-colors hover:bg-black/[0.03]"
      >
        <UsersIcon className="size-4 text-muted-foreground" />
        <span>{count} going</span>
        <ChevronDownIcon className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 overflow-hidden border-white/30 bg-[var(--paper-2)]/70 p-0 shadow-lg backdrop-blur-xl"
      >
        <div className="border-b border-border px-4 py-2.5 text-sm font-medium">
          Going · {count}
        </div>
        {count === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No one going yet.
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {names.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-black/[0.03]"
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${PALETTE[i % PALETTE.length]}`}
                >
                  {initials(p)}
                </span>
                {p}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
