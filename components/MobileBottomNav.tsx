"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrickValueLogo from "@/src/components/BrickValueLogo";
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111111] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-center border-b border-white/5 py-2">
        <Link href="/" aria-label="BrickValue home">
          <BrickValueLogo variant="icon" size={24} />
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
