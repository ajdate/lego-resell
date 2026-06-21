"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/src/lib/alertsContext";
import { isToolPath } from "@/lib/tools";

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
    isActive: (path: string) =>
      path === "/portfolio" || path.startsWith("/portfolio/"),
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
    href: "/tools",
    icon: "🛠",
    label: "Tools",
    isActive: (path: string) => isToolPath(path),
    showToolDot: true,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useAlerts();

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111111] md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex justify-center border-b border-white/5 py-2">
        <Link
          href="/"
          aria-label="BrickValue home"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center py-2"
        >
          <img
            src="/brickvalue-icon.png"
            alt="BrickValue"
            className="h-9 w-9 flex-shrink-0 rounded-xl object-contain"
          />
        </Link>
      </div>
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const { href, icon, label, isActive } = item;
          const showBadge = "showBadge" in item && item.showBadge;
          const showToolDot = "showToolDot" in item && item.showToolDot;
          const active = isActive(pathname);
          const onToolPage = showToolDot && isToolPath(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-center transition ${
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
                  {onToolPage && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#f59e0b]" />
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
