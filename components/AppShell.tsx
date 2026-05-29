"use client";

import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ToolVisitTracker } from "@/components/ToolVisitTracker";
import { WaitlistFooterLink } from "@/components/WaitlistFooterLink";
import { AlertsProvider } from "@/src/lib/alertsContext";
import { CurrencyProvider } from "@/src/lib/currencyContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <AlertsProvider>
        <div className="flex min-h-full flex-col overflow-x-hidden">
          <ToolVisitTracker />
          {children}
          <WaitlistFooterLink className="px-4 pb-2 pt-4 md:pb-3" />
          <MobileBottomNav />
        </div>
      </AlertsProvider>
    </CurrencyProvider>
  );
}
