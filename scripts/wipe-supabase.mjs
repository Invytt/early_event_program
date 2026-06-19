// One-off: empties Event + Rsvp rows and clears the `covers` storage bucket.
// Uses the exact creds from .env.local. Schema/tables are NOT dropped.
import "dotenv/config"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local", override: true })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

// 1) rows — delete Rsvp first (FK), then Event
for (const table of ["Rsvp", "Event"]) {
  const { error, count } = await sb
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null)
  if (error) {
    console.error(`delete ${table} failed:`, error.message)
    process.exit(1)
  }
  console.log(`cleared ${table}: ${count ?? "?"} rows`)
}

// 2) storage — list + remove all objects in covers/ (flat layout)
let removed = 0
for (;;) {
  const { data, error } = await sb.storage
    .from("covers")
    .list("", { limit: 1000 })
  if (error) {
    console.error("list covers failed:", error.message)
    break
  }
  if (!data || data.length === 0) break
  const names = data.map((o) => o.name)
  const { error: rmErr } = await sb.storage.from("covers").remove(names)
  if (rmErr) {
    console.error("remove covers failed:", rmErr.message)
    break
  }
  removed += names.length
  if (data.length < 1000) break
}
console.log(`cleared covers: ${removed} files`)
console.log("done.")
