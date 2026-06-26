import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "../../components/AppShell";
import { BRICKVALUE_APP_ORIGIN } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "LEGO investment intelligence for serious collectors. 21,000+ LEGO sets tracked with instant SELL/HOLD recommendations, live eBay pricing and AI listings.";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    default: "BrickValue — Invest Smarter. Collect Better.",
    template: "%s | BrickValue",
  },
  description: siteDescription,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BrickValue",
  },
  metadataBase: new URL(BRICKVALUE_APP_ORIGIN),
  openGraph: {
    title: "BrickValue — Invest Smarter. Collect Better.",
    description: siteDescription,
    url: BRICKVALUE_APP_ORIGIN,
    siteName: "BrickValue",
    images: [
      {
        url: `${BRICKVALUE_APP_ORIGIN}/brickvalue-banner.png`,
        width: 1200,
        height: 630,
        alt: "BrickValue — Invest Smarter. Collect Better.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BrickValue — Invest Smarter. Collect Better.",
    description:
      "LEGO investment intelligence for serious collectors.",
    images: [`${BRICKVALUE_APP_ORIGIN}/brickvalue-banner.png`],
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
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
      <head>
        <link rel="icon" href="/brickvalue-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/brickvalue-icon-homescreen.png" />
        <link rel="shortcut icon" href="/brickvalue-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="BrickValue" />
        <meta name="theme-color" content="#f59e0b" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
}
`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-[#0c0c0f] text-zinc-100">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <AppShell>{children}</AppShell>
        </ClerkProvider>
      </body>
    </html>
  );
}
