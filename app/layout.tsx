import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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

export const metadata: Metadata = {
  title: "Eric Cole — Software Engineer",
  description: "Software engineer focused on building calm, usable products.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${serif.variable} ${script.variable} ${mono.variable}`}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
