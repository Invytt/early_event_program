import "server-only"

// The single admin account allowed into the dashboard. Override with ADMIN_EMAIL.
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "events@invytt.com")
  .trim()
  .toLowerCase()

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email) && email!.trim().toLowerCase() === ADMIN_EMAIL
}
