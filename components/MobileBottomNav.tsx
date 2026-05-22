"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    href: "/opportunities",
    icon: "🔥",
    label: "Opportunities",
    isActive: (path: string) => path.startsWith("/opportunities"),
  },
  {
    href: "/retiring-soon",
    icon: "⚠️",
    label: "Retiring",
    isActive: (path: string) => path.startsWith("/retiring-soon"),
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111111] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map(({ href, icon, label, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 pt-2 text-center transition ${
                  active
                    ? "border-t-2 border-[#f59e0b] text-[#f59e0b]"
                    : "border-t-2 border-transparent text-zinc-500"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {icon}
                </span>
                <span className="text-xs font-medium leading-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
