import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

import { SURVEY_INTRO } from "@/lib/survey-content";

import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex-arabic",
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
  themeColor: "#fdfaf6",
  // Teachers zoom into Arabic text on small phones; never block that.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable}>
      <body className="min-h-dvh overflow-x-hidden font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
