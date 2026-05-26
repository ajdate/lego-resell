"use client";

import Link from "next/link";
import { useAlerts } from "@/src/lib/alertsContext";

export function AlertBell({ className = "" }: { className?: string }) {
  const { unreadCount } = useAlerts();

  return (
    <Link
      href="/alerts"
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700/80 bg-white/5 text-lg transition hover:border-[#f59e0b]/50 hover:bg-[#f59e0b]/10 ${className}`}
      aria-label={
        unreadCount > 0
          ? `Alert Centre, ${unreadCount} unread`
          : "Alert Centre"
      }
    >
      <span aria-hidden>🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#f59e0b] px-1 text-[10px] font-bold text-black">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
