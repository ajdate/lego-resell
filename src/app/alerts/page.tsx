"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AlertCard } from "@/components/AlertCard";
import {
  ALERT_FILTER_OPTIONS,
  countAlertsByCategory,
  filterAlertsByCategory,
  type AlertFilterKey,
} from "@/lib/alerts";
import { useAlerts } from "@/src/lib/alertsContext";

const FUTURE_FEATURES = [
  {
    icon: "📧",
    title: "Email Alerts",
    description:
      "Get notified by email when sets retire or spike in value. Coming in V2.",
  },
  {
    icon: "📱",
    title: "Push Notifications",
    description:
      "Mobile alerts for retirement and price events. Coming in V2.",
  },
  {
    icon: "🔍",
    title: "Live Price Monitoring",
    description: "Real-time BrickLink price tracking. Coming in V3.",
  },
] as const;

export default function AlertsPage() {
  const { getVisibleAlerts, dismiss, markRead, markAllRead, refreshAlerts } =
    useAlerts();
  const [filter, setFilter] = useState<AlertFilterKey>("all");

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  const visible = getVisibleAlerts();

  const filtered = useMemo(
    () => filterAlertsByCategory(visible, filter),
    [visible, filter],
  );

  const counts = useMemo(
    () => countAlertsByCategory(visible),
    [visible],
  );

  function handleMarkAllRead() {
    markAllRead(visible.map(({ alert }) => alert.id));
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader title="Alert Centre" subtitle="Price and retirement notifications" />

      <main className="page-main mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-white">Alert Centre</h2>
              {counts.unread > 0 && (
                <span className="rounded-full bg-[#f59e0b] px-2.5 py-0.5 text-xs font-bold text-black">
                  {counts.unread} unread
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Retirement signals, price movements and portfolio alerts
            </p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">
                {counts.unread} unread alert{counts.unread === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {counts.retirement} retirement · {counts.priceMovement} price
                movement · {counts.strategy} strategy conflict
                {counts.opportunities > 0 &&
                  ` · ${counts.opportunities} opportunit${counts.opportunities === 1 ? "y" : "ies"}`}
                {counts.actionRequired > 0 &&
                  ` · ${counts.actionRequired} action required`}
              </p>
            </div>
            {visible.length > 0 && counts.unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="rounded-lg border border-zinc-600 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
              >
                Mark all as read
              </button>
            )}
          </div>
        </section>

        <div className="filter-scroll mt-6 flex gap-2 overflow-x-auto pb-1">
          {ALERT_FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`filter-chip shrink-0 rounded-lg px-3 text-xs font-medium transition ${
                filter === key
                  ? "bg-[#f59e0b]/20 text-[#f59e0b] ring-1 ring-[#f59e0b]/40"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <li className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
              <p className="text-4xl" aria-hidden>
                🔔
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                {visible.length === 0
                  ? "No active alerts. You're all caught up."
                  : "No alerts in this category."}
              </p>
            </li>
          ) : (
            filtered.map(({ alert, isRead }) => (
              <li key={alert.id}>
                <AlertCard
                  alert={alert}
                  isRead={isRead}
                  onDismiss={() => dismiss(alert.id)}
                  onView={() => markRead(alert.id)}
                />
              </li>
            ))
          )}
        </ul>

        <section className="mt-12">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Future alerts
          </h2>
          <ul className="mt-4 space-y-3">
            {FUTURE_FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 opacity-60"
              >
                <p className="text-sm font-semibold text-zinc-500">
                  <span className="mr-2" aria-hidden>
                    {feature.icon}
                  </span>
                  {feature.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
