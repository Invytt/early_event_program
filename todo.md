Two places you'll need subdomains:

1. Host the app on a subdomain (e.g. app.invytt.com)
- If deploying on Vercel: Project → Settings → Domains → add app.invytt.com → Vercel shows a record to add:
  - Usually a CNAME: app → cname.vercel-dns.com
  - Add that at your DNS provider. Vercel auto-issues SSL.
- Root invytt.com can stay your landing; app lives at the subdomain.

2. Clerk production subdomains (required for prod auth)
- Clerk Dashboard → Domains (after creating the prod instance) lists CNAMEs to add — typically:
  - clerk.invytt.com → Clerk's frontend API host
  - accounts.invytt.com, clkmail.invytt.com, plus 2 DKIM (clk._domainkey…) for email
- Add each as a CNAME at your DNS provider exactly as shown.

How to add a CNAME (generic):
At your DNS host, create record:
- Type: CNAME
- Name/Host: the subdomain part only (app, or clerk)
- Value/Target: what Vercel/Clerk gave you
- TTL: default/auto
- If on Cloudflare: set the record to DNS only (grey cloud), not proxied — Clerk's DNS check fails behind Cloudflare proxy.

Questions to give exact steps:
1. Where is invytt.com's DNS — registrar (which?), or Cloudflare, or Vercel?
2. What subdomain for the app — app.invytt.com? events.invytt.com? (root stays landing?)
3. Hosting on Vercel?