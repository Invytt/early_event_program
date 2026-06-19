import "server-only"

// Single choke-point for server-side error reporting.
// Today it logs to the console (captured by the host's log drain). Drop in
// Sentry/Datadog here later — or set ERROR_WEBHOOK_URL to fan errors out to a
// webhook (Slack, etc.) without adding a dependency.
export function reportError(context: string, error: unknown) {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  console.error(`[${context}]`, message)

  const url = process.env.ERROR_WEBHOOK_URL
  if (url) {
    // fire-and-forget; never let reporting throw into the caller
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, message, at: new Date().toISOString() }),
    }).catch(() => {})
  }
}
