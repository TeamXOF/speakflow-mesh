import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import AppShell from "@/components/AppShell";
import { SpeakFlowProvider } from "@/Context/SpeakFlowContext";
import { ReadingSessionProvider } from "@/contexts/ReadingSessionContext";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpeakFlow",
  description: "AI-powered reading assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SpeakFlowProvider>
          <ReadingSessionProvider>
            <AppShell>{children}</AppShell>
          </ReadingSessionProvider>
        </SpeakFlowProvider>
      </body>
    </html>
  );
}
