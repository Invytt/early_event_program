import "server-only"

import { createClient } from "@supabase/supabase-js"

const BUCKET = "covers"

function client() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
  }
  // service-role client: bypasses storage RLS, server-only
  return createClient(url, key, { auth: { persistSession: false } })
}

export function storageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

export async function uploadCover(file: File): Promise<string> {
  const ext = EXT[file.type]
  if (!ext) throw new Error("Unsupported image type")
  const supabase = client()
  const path = `${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// remove a cover object given its public URL (best-effort, never throws)
export async function deleteCover(url: string | null): Promise<void> {
  if (!url || !storageConfigured()) return
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  const path = url.slice(i + marker.length)
  if (!path) return
  try {
    await client().storage.from(BUCKET).remove([path])
  } catch (e) {
    console.error("[storage] delete cover failed", e)
  }
}
