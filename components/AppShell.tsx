"use client";

import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AlertsProvider } from "@/src/lib/alertsContext";
import { CurrencyProvider } from "@/src/lib/currencyContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <AlertsProvider>
        <div className="flex min-h-full flex-col overflow-x-hidden">
          {children}
          <MobileBottomNav />
        </div>
      </AlertsProvider>
    </CurrencyProvider>
  );
}
