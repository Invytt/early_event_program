import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://events.invytt.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // generic crawlers: keep invite pages out of search indexes
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api", "/e/"],
      },
      // link-preview / social crawlers: allow /e/ so they can fetch OG images
      {
        userAgent: [
          "Twitterbot",
          "facebookexternalhit",
          "LinkedInBot",
          "Slackbot",
          "Slackbot-LinkExpanding",
          "WhatsApp",
          "Discordbot",
          "TelegramBot",
          "Pinterestbot",
        ],
        allow: ["/", "/e/"],
        disallow: ["/dashboard", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
