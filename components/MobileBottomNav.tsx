"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/src/lib/alertsContext";

const NAV_ITEMS = [
  {
    href: "/",
    icon: "🔍",
    label: "Search",
    isActive: (path: string) => path === "/",
  },
  {
    href: "/portfolio",
    icon: "📊",
    label: "Portfolio",
    isActive: (path: string) => path.startsWith("/portfolio"),
  },
  {
    href: "/watchlist",
    icon: "👀",
    label: "Watchlist",
    isActive: (path: string) => path.startsWith("/watchlist"),
  },
  {
    href: "/alerts",
    icon: "🔔",
    label: "Alerts",
    isActive: (path: string) => path.startsWith("/alerts"),
    showBadge: true,
  },
  {
    href: "/opportunities",
    icon: "🔥",
    label: "Opportunities",
    isActive: (path: string) => path.startsWith("/opportunities"),
  },
  {
    href: "/profit-calculator",
    icon: "💰",
    label: "Profit",
    isActive: (path: string) => path.startsWith("/profit-calculator"),
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useAlerts();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111111] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const { href, icon, label, isActive } = item;
          const showBadge = "showBadge" in item && item.showBadge;
          const active = isActive(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 pt-2 text-center transition ${
                  active
                    ? "border-t-2 border-[#f59e0b] text-[#f59e0b]"
                    : "border-t-2 border-transparent text-zinc-500"
                }`}
              >
                <span className="relative text-lg leading-none" aria-hidden>
                  {icon}
                  {showBadge && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#f59e0b] px-0.5 text-[9px] font-bold text-black">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-tight sm:text-xs">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
