import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrickValue — Invest Smarter. Collect Better.",
  description:
    "LEGO investment intelligence for serious collectors. Instant valuations, SELL/HOLD recommendations, AI listings and portfolio tracking.",
};

const FAVICON_DATA_URI =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📈</text></svg>";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="icon" href={FAVICON_DATA_URI} />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-[#0c0c0f] text-zinc-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
