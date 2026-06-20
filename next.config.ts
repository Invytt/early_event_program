import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    // smaller payloads for cover images; cache optimized variants for a day
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    // Supabase Storage public URLs for event covers
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    // baseline hardening. CSP intentionally omitted — Clerk + Google Maps inject
    // inline/3rd-party scripts; a real CSP needs nonces and per-domain allowlists.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ]
  },
  experimental: {
    // cover uploads go through a server action as FormData.
    // 6mb gives headroom over the 5MB file cap in uploadCoverAction —
    // multipart/base64 encoding inflates the payload past the raw file size.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
