import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

// Admin-only platform: only this account may reach the dashboard.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'events@invytt.com')
  .trim()
  .toLowerCase()

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
    // if the session token carries an email, bounce non-admins early.
    // (the dashboard layout re-checks authoritatively via currentUser().)
    const { sessionClaims } = await auth()
    const email = (sessionClaims as { email?: string } | null)?.email
      ?.trim()
      .toLowerCase()
    if (email && email !== ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
