import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// ---- mock the supabase client ----
const { upload, getPublicUrl, remove, from, createClient } = vi.hoisted(() => {
  const upload = vi.fn()
  const getPublicUrl = vi.fn()
  const remove = vi.fn()
  const from = vi.fn(() => ({ upload, getPublicUrl, remove }))
  const createClient = vi.fn(() => ({ storage: { from } }))
  return { upload, getPublicUrl, remove, from, createClient }
})
vi.mock("@supabase/supabase-js", () => ({ createClient }))

import { storageConfigured, uploadCover, deleteCover } from "@/lib/storage"

function fakeFile(type: string, bytes = 4): File {
  return new File([new Uint8Array(bytes)], "c.png", { type })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
  upload.mockResolvedValue({ error: null })
  getPublicUrl.mockReturnValue({ data: { publicUrl: "https://proj.supabase.co/storage/v1/object/public/covers/x.png" } })
  remove.mockResolvedValue({ error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe("storageConfigured", () => {
  it("is true when both env vars are present", () => {
    expect(storageConfigured()).toBe(true)
  })
  it("is false when the service key is missing", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
    expect(storageConfigured()).toBe(false)
  })
})

describe("uploadCover", () => {
  it("uploads a supported image and returns its public url", async () => {
    const url = await uploadCover(fakeFile("image/png"))
    expect(url).toContain("/covers/")
    expect(upload).toHaveBeenCalledOnce()
    // path uses a uuid + correct extension
    const [path, , opts] = upload.mock.calls[0]
    expect(path).toMatch(/\.png$/)
    expect(opts).toMatchObject({ contentType: "image/png", upsert: false })
  })

  it("maps jpeg to a .jpg extension", async () => {
    await uploadCover(fakeFile("image/jpeg"))
    expect(upload.mock.calls[0][0]).toMatch(/\.jpg$/)
  })

  it("rejects an unsupported mime type", async () => {
    await expect(uploadCover(fakeFile("image/bmp"))).rejects.toThrow("Unsupported image type")
    expect(upload).not.toHaveBeenCalled()
  })

  it("throws when the storage upload errors", async () => {
    upload.mockResolvedValue({ error: { message: "quota exceeded" } })
    await expect(uploadCover(fakeFile("image/webp"))).rejects.toThrow("quota exceeded")
  })
})

describe("deleteCover", () => {
  it("extracts the object path from a public url and removes it", async () => {
    await deleteCover("https://proj.supabase.co/storage/v1/object/public/covers/abc.png")
    expect(remove).toHaveBeenCalledWith(["abc.png"])
  })

  it("no-ops on a null url", async () => {
    await deleteCover(null)
    expect(remove).not.toHaveBeenCalled()
  })

  it("no-ops when storage is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "")
    await deleteCover("https://x/covers/abc.png")
    expect(remove).not.toHaveBeenCalled()
  })

  it("no-ops when the url has no covers marker", async () => {
    await deleteCover("https://x/other/abc.png")
    expect(remove).not.toHaveBeenCalled()
  })

  it("never throws if remove rejects", async () => {
    remove.mockRejectedValue(new Error("network"))
    await expect(
      deleteCover("https://proj.supabase.co/storage/v1/object/public/covers/abc.png")
    ).resolves.toBeUndefined()
  })
})
