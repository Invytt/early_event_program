"use client"

import * as React from "react"
import { ChevronDownIcon, UsersIcon } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const FIRST = [
  "Ava", "Liam", "Noah", "Mia", "Ethan", "Sofia", "Lucas", "Isla", "Maya",
  "Kai", "Riya", "Leo", "Zoe", "Aria", "Dev", "Nina", "Omar", "Tara",
]
const LAST = [
  "Patel", "Chen", "Garcia", "Kim", "Singh", "Lopez", "Khan", "Müller",
  "Rossi", "Nguyen", "Silva", "Cohen",
]

function name(i: number) {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`
}

const PALETTE = [
  "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-emerald-500",
  "bg-sky-500", "bg-violet-500", "bg-teal-500",
]

export function AttendeesPopover({ count }: { count: number }) {
  const people = React.useMemo(
    () => Array.from({ length: count }, (_, i) => name(i)),
    [count]
  )

  return (
    <Popover>
      <PopoverTrigger className="group flex w-full items-center gap-3 rounded-lg border border-border bg-[var(--paper-2)] px-4 py-3 text-left text-sm transition-colors hover:bg-black/[0.03]">
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
        <ul className="max-h-72 overflow-y-auto py-1">
          {people.map((p, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-black/[0.03]"
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${PALETTE[i % PALETTE.length]}`}
              >
                {p.split(" ").map((w) => w[0]).join("")}
              </span>
              {p}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
