import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientProviders from "@/components/layout/ClientProviders";

// Self-hosted variable fonts (next/font/local) — no build-time dependency on
// fonts.googleapis.com, so builds and demos work fully offline.
const dmSans = localFont({
  variable: "--font-dm-sans",
  src: "./fonts/dm-sans-latin-wght-normal.woff2",
  weight: "100 1000",
  display: "swap",
});

const jetbrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  display: "swap",
});

// Urdu rendering for Child Mode / story text (roadmap UI Prompt 5)
const notoNastaliqUrdu = localFont({
  variable: "--font-noto-urdu",
  src: "./fonts/noto-nastaliq-urdu-arabic-wght-normal.woff2",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpeakFlow AI",
  description: "Every reader. Every day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${notoNastaliqUrdu.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg-base text-text-primary">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
