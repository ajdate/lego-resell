"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertBell } from "@/components/AlertBell";
import { isToolPath } from "@/lib/tools";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

const NAV_LINKS = [
  { href: "/", label: "Search" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/watchlist", label: "Watch List" },
  { href: "/alerts", label: "Alerts" },
  { href: "/tools", label: "Tools →", accent: true },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/tools") return isToolPath(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({
  title = "BrickValue",
  subtitle = "LEGO resell assistant",
}: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/60 px-6 py-5 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="BrickValue home"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f59e0b] text-lg font-bold text-zinc-900 transition hover:bg-[#fbbf24]"
          >
            B
          </Link>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">
              {title}
            </p>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AlertBell />
          <nav
            className="hidden flex-wrap justify-end gap-1 text-sm md:flex sm:gap-2"
            aria-label="Main"
          >
            {NAV_LINKS.map((item) => {
              const { href, label } = item;
              const accent = "accent" in item && item.accent;
              const active = isNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    active
                      ? "bg-zinc-800 text-white"
                      : accent
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-[#f59e0b]"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
