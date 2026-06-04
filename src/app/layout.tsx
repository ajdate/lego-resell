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
  icons: {
    icon: "/brickvalue-logo.png",
    apple: "/brickvalue-logo.png",
  },
};

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
      <body className="min-h-full flex flex-col overflow-x-hidden bg-[#0c0c0f] text-zinc-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
