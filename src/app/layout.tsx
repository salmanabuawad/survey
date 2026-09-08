import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Sans_Hebrew } from "next/font/google";

import { SiteChrome } from "@/components/brand/site-chrome";
import { dirOf, isLocale, SOURCE_LOCALE } from "@/lib/i18n/config";
import { SURVEY_INTRO } from "@/lib/survey-content";

import "./globals.css";

// Both faces are loaded and stacked. Neither carries the other's script, so the
// browser falls through to whichever one can actually draw the glyph — one
// stack serves Arabic, Hebrew and Latin without swapping fonts per locale.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex-arabic",
});

const plexHebrew = IBM_Plex_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex-hebrew",
});

export const metadata: Metadata = {
  title: SURVEY_INTRO.title,
  description: SURVEY_INTRO.subtitle,
  // The questionnaire is anonymous; keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14786f",
  // Teachers zoom into text on small phones; never block that.
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Set by middleware from the URL prefix; /admin and anything else gets the
  // source language.
  const header = (await headers()).get("x-survey-locale") ?? undefined;
  const locale = isLocale(header) ? header : SOURCE_LOCALE;

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${plexArabic.variable} ${plexHebrew.variable}`}
    >
      <body className="min-h-dvh overflow-x-hidden font-sans antialiased">
        <SiteChrome />
        {children}
      </body>
    </html>
  );
}
