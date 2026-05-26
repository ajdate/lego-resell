"use client";

import Link from "next/link";
import type { Alert } from "@/lib/alerts";

export function AlertCard({
  alert,
  isRead,
  onDismiss,
  onView,
}: {
  alert: Alert;
  isRead: boolean;
  onDismiss: () => void;
  onView: () => void;
}) {
  const resultsHref = alert.setNumber
    ? `/results?set=${encodeURIComponent(alert.setNumber)}&condition=sealed`
    : "/portfolio";

  return (
    <article
      className={`rounded-xl p-4 transition ${
        isRead
          ? "border border-transparent bg-white/[0.03]"
          : `border border-transparent bg-white/[0.08] ${alert.accentClass} border-l-2`
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span className="mr-1.5" aria-hidden>
              {alert.icon}
            </span>
            {alert.typeLabel}
            {alert.setName !== "Portfolio" && (
              <span className="ml-2 font-normal normal-case text-zinc-400">
                · {alert.setName}
              </span>
            )}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {alert.message}
          </p>
          <p className="mt-2 text-xs text-zinc-600">Generated today</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={resultsHref}
          onClick={onView}
          className="touch-target rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
        >
          View Set →
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="touch-target rounded-lg border border-zinc-600 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}
