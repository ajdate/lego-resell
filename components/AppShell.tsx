"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ToolVisitTracker } from "@/components/ToolVisitTracker";
import { AlertsProvider } from "@/src/lib/alertsContext";
import { CurrencyProvider } from "@/src/lib/currencyContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome =
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/pro/");

  return (
    <CurrencyProvider>
      <AlertsProvider>
        <div className="flex min-h-full flex-col overflow-x-hidden">
          <ToolVisitTracker />
          {children}
          {!hideChrome && <MobileBottomNav />}
        </div>
      </AlertsProvider>
    </CurrencyProvider>
  );
}
