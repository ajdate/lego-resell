"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertsProvider } from "@/src/lib/alertsContext";
import { CurrencyProvider } from "@/src/lib/currencyContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: "🔍", label: "Search" },
    { href: "/portfolio", icon: "📊", label: "Portfolio" },
    { href: "/watchlist", icon: "👀", label: "Watchlist" },
    { href: "/alerts", icon: "🔔", label: "Alerts" },
    { href: "/tools", icon: "🔧", label: "Tools" },
  ];

  return (
    <CurrencyProvider>
      <AlertsProvider>
        <div className="flex min-h-full flex-col">
          <main className="flex-1 pb-20">{children}</main>
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0a0a]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-around px-2 py-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-1 ${
                    pathname === item.href ? "text-amber-400" : "text-white/40"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </AlertsProvider>
    </CurrencyProvider>
  );
}
