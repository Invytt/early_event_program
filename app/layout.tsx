import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Playfair_Display, Dancing_Script, Space_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-serif",
});

const script = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-script",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://events.invytt.com";
const OG_IMAGE = "/logo-black.png";
const LOGO = "/logo-black.png";

const TITLE = "Invytt — Early Event Program";
const DESCRIPTION =
  "Join the Invytt Early Event Program — host events early with us, get access to exclusive host features, and help build the future of event hosting. Create event invites, collect RSVPs, and manage your guest list.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Invytt",
  },
  description: DESCRIPTION,
  applicationName: "Invytt",
  generator: "Next.js",
  keywords: [
    "early event program",
    "event hosting app",
    "event planning India",
    "online invitations",
    "RSVP tracking",
    "guest list management",
    "host events online",
    "Invytt",
  ],
  authors: [{ name: "Invytt", url: "https://invytt.com" }],
  creator: "Invytt",
  publisher: "Invytt",
  category: "technology",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Invytt",
    title: TITLE,
    description:
      "Host events early with us, get exclusive host features, and help build the future of event hosting.",
    images: [
      {
        url: OG_IMAGE,
        width: 500,
        height: 500,
        alt: "Invytt — Early Event Program",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description:
      "Host events early with us, get exclusive host features, and help build the future of event hosting.",
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: LOGO,
    shortcut: LOGO,
    apple: LOGO,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Invytt",
      url: "https://invytt.com",
      logo: `${SITE_URL}${LOGO}`,
      email: "events@invytt.com",
      foundingDate: "2026",
      areaServed: "IN",
      description: DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Invytt — Early Event Program",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@type": "SoftwareApplication",
      name: "Invytt",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, iOS, Android",
      url: SITE_URL,
      description: DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="canonical" href={SITE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${serif.variable} ${script.variable} ${mono.variable}`}>
        <ClerkProvider>{children}</ClerkProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
