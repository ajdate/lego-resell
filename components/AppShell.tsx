"use client";

import { MobileBottomNav } from "@/components/MobileBottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col overflow-x-hidden">
      {children}
      <MobileBottomNav />
    </div>
  );
}
