"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ValueChart } from "@/components/ValueChart";
import { formatAud, loadPortfolio } from "@/lib/portfolio";
import {
  detectGrowthMilestones,
  filterSnapshotsByRange,
  getGrowthSnapshots,
  getGrowthSummary,
  getMonthlyBreakdown,
  getThemeGrowthInsights,
  saveGrowthSnapshot,
  type GrowthDateRange,
  type GrowthSnapshot,
} from "@/lib/growthTracking";

const RANGE_OPTIONS: { key: GrowthDateRange; label: string }[] = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "all", label: "All Time" },
];

function formatMilestoneDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function GrowthEmptyState() {
  const placeholderHeights = [35, 55, 40, 70, 50, 85, 60];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h2 className="text-xl font-bold text-white">
        Start building your portfolio to track growth over time
      </h2>
      <p className="mt-3 text-sm text-zinc-500">
        Add sets from analysis results and return daily to build your value
        history chart.
      </p>

      <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-6 opacity-40">
        <div className="flex h-[160px] items-end justify-center gap-2">
          {placeholderHeights.map((h, i) => (
            <div
              key={i}
              className="w-8 rounded-t-sm bg-[#f59e0b]/40"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-600">Preview — growth chart</p>
      </div>

      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-[#f59e0b] px-6 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
      >
        Search sets
      </Link>
    </div>
  );
}

export default function GrowthPage() {
  const [snapshots, setSnapshots] = useState<GrowthSnapshot[]>([]);
  const [range, setRange] = useState<GrowthDateRange>("all");
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    const portfolio = loadPortfolio();
    if (portfolio.length > 0) {
      saveGrowthSnapshot(portfolio);
    }
    setSnapshots(getGrowthSnapshots());
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rangedSnapshots = useMemo(
    () => filterSnapshotsByRange(snapshots, range),
    [snapshots, range],
  );

  const summary = useMemo(
    () => getGrowthSummary(rangedSnapshots),
    [rangedSnapshots],
  );
  const milestones = useMemo(
    () => detectGrowthMilestones(rangedSnapshots),
    [rangedSnapshots],
  );
  const monthly = useMemo(
    () => getMonthlyBreakdown(rangedSnapshots),
    [rangedSnapshots],
  );
  const themeInsights = useMemo(() => {
    const portfolio = loadPortfolio();
    return getThemeGrowthInsights(portfolio, snapshots);
  }, [snapshots]);

  const themeHighlights = useMemo(() => {
    if (snapshots.length < 2) return [];
    const first = snapshots[0];
    const latest = snapshots[snapshots.length - 1];
    const lines: string[] = [];

    const ucsThemes = ["Star Wars UCS", "UCS Star Wars"];
    for (const theme of ucsThemes) {
      const added =
        (latest.themeBreakdown[theme] ?? 0) -
        (first.themeBreakdown[theme] ?? 0);
      if (added > 0) {
        lines.push(
          `You've added ${added} UCS set${added === 1 ? "" : "s"} since tracking began`,
        );
      }
    }

    const modularStart = first.themeBreakdown["Modular"] ?? 0;
    const modularNow = latest.themeBreakdown["Modular"] ?? 0;
    const startCopies = Object.values(first.themeBreakdown).reduce(
      (a, b) => a + b,
      0,
    );
    const nowCopies = Object.values(latest.themeBreakdown).reduce(
      (a, b) => a + b,
      0,
    );
    if (startCopies > 0 && nowCopies > 0) {
      const startPct = Math.round((modularStart / startCopies) * 100);
      const nowPct = Math.round((modularNow / nowCopies) * 100);
      if (modularStart > 0 || modularNow > 0) {
        lines.push(
          `Modular share of portfolio grew from ${startPct}% to ${nowPct}%`,
        );
      }
    }

    return lines;
  }, [snapshots]);

  const hasData = snapshots.length > 0;

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader
        title="Collection Growth"
        subtitle="Track how your portfolio value has changed over time"
      />

      <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {loaded && !hasData ? (
          <GrowthEmptyState />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRange(opt.key)}
                  className={`filter-chip rounded-lg px-3 text-xs font-semibold transition ${
                    range === opt.key
                      ? "bg-[#f59e0b] text-zinc-900"
                      : "border border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {summary && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-xs text-zinc-500">Total value growth</p>
                  <p
                    className={`mt-1 text-lg font-bold ${
                      summary.totalGrowthDollars >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {summary.totalGrowthDollars >= 0 ? "+" : ""}
                    {formatAud(summary.totalGrowthDollars)} (
                    {summary.totalGrowthPercent >= 0 ? "↑" : "↓"}
                    {Math.abs(summary.totalGrowthPercent)}%)
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {range === "all" ? "since tracking began" : `in selected period`}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-xs text-zinc-500">Days tracked</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {summary.daysTracked} days
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-xs text-zinc-500">Sets added</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {summary.setsAddedTotal} sets added to collection
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-xs text-zinc-500">Best period</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">
                    Best gain: +{formatAud(summary.bestMonth.growth)} in{" "}
                    {summary.bestMonth.month}
                  </p>
                </div>
              </div>
            )}

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
                Portfolio value over time
              </h2>
              <div className="mt-4">
                <ValueChart
                  snapshots={snapshots}
                  dateRange={range}
                  loading={!loaded}
                />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
                Profit / loss over time
              </h2>
              <div className="mt-4">
                <ValueChart
                  snapshots={snapshots}
                  dateRange={range}
                  showProfitLoss
                  loading={!loaded}
                />
              </div>
            </section>

            {milestones.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
                  Growth milestones
                </h2>
                <ol className="relative mt-6 ml-3 border-l-2 border-white/10">
                  {milestones.map((m) => (
                    <li
                      key={`${m.date}-${m.description}`}
                      className="relative pb-6 pl-8 last:pb-0"
                    >
                      <span
                        className="absolute left-0 top-1 h-3 w-3 -translate-x-[7px] rounded-full bg-[#f59e0b] ring-2 ring-[#f59e0b]/30"
                        aria-hidden
                      />
                      <p className="text-xs text-zinc-500">
                        {formatMilestoneDate(m.date)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {m.icon} {m.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {monthly.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
                  Monthly breakdown
                </h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Starting</th>
                        <th className="px-4 py-3">Ending</th>
                        <th className="px-4 py-3">Change $</th>
                        <th className="px-4 py-3">Change %</th>
                        <th className="px-4 py-3">Added</th>
                        <th className="px-4 py-3">Removed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((row) => (
                        <tr
                          key={row.month}
                          className="border-b border-zinc-800/60 last:border-0"
                        >
                          <td className="px-4 py-3 font-medium text-white">
                            {row.monthLabel}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {formatAud(row.startingValue)}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {formatAud(row.endingValue)}
                          </td>
                          <td
                            className={`px-4 py-3 font-semibold ${
                              row.changeDollars >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {row.changeDollars >= 0 ? "+" : ""}
                            {formatAud(row.changeDollars)}
                          </td>
                          <td
                            className={`px-4 py-3 ${
                              row.changePercent >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {row.changePercent >= 0 ? "+" : ""}
                            {row.changePercent}%
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {row.setsAdded}
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {row.setsRemoved}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {themeInsights.length > 0 && snapshots.length >= 2 && (
              <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
                  Theme growth
                </h2>
                {themeHighlights.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {themeHighlights.map((line) => (
                      <li key={line} className="text-sm text-zinc-300">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="mt-6 space-y-4">
                  {themeInsights.map((t) => (
                    <li
                      key={t.theme}
                      className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3"
                    >
                      <p className="font-semibold text-white">{t.theme}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Sets: {t.setsStart} → {t.setsNow}
                        {t.setsAdded > 0 && (
                          <span className="text-emerald-400">
                            {" "}
                            (+{t.setsAdded})
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Value: {formatAud(t.valueStart)} →{" "}
                        {formatAud(t.valueNow)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
