"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RecommendationJourneyTimeline } from "@/components/RecommendationJourneyTimeline";
import { SetImage } from "@/components/SetImage";
import { findSet, isSetRetired, isSetRetiringSoon } from "@/lib/analyze";
import {
  buildShareBestCallText,
  formatHistoryDate,
  getBestAndWorstCalls,
  getGlobalHistorySummaries,
  getHistoryInsights,
  getTrendIndicator,
  markHistorySeen,
  type SetHistorySummary,
} from "@/lib/recommendationHistory";
import { useCurrency } from "@/src/lib/currencyContext";

type HistoryFilter =
  | "all"
  | "changed"
  | "gaining"
  | "losing"
  | "sell"
  | "hold";

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "changed", label: "Changed" },
  { key: "gaining", label: "Gaining" },
  { key: "losing", label: "Losing" },
  { key: "sell", label: "SELL" },
  { key: "hold", label: "HOLD" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function retirementLabel(retired?: boolean, retiringSoon?: boolean): string {
  if (retired) return "Retired";
  if (retiringSoon) return "Retiring soon";
  return "Active";
}

function RecBadge({ rec }: { rec: "SELL" | "HOLD" }) {
  const isSell = rec === "SELL";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
        isSell
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-[#f59e0b]/20 text-[#f59e0b]"
      }`}
    >
      {rec}
    </span>
  );
}

export default function HistoryPage() {
  const { formatPrice } = useCurrency();
  const [summaries, setSummaries] = useState<SetHistorySummary[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [loaded, setLoaded] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSummaries(getGlobalHistorySummaries());
    setLoaded(true);
    markHistorySeen();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { best, worst } = useMemo(() => getBestAndWorstCalls(), [summaries]);
  const insights = useMemo(() => getHistoryInsights(), [summaries]);

  const stats = useMemo(() => {
    if (summaries.length === 0) {
      return {
        totalSets: 0,
        changedCount: 0,
        avgValueChange: 0,
        mostAnalysed: null as SetHistorySummary | null,
      };
    }
    const changedCount = summaries.filter((s) => s.everChanged).length;
    const mostAnalysed = summaries.reduce((bestSet, s) =>
      s.analysisCount > (bestSet?.analysisCount ?? 0) ? s : bestSet,
    );
    const valueChanges = summaries
      .map((s) => s.valueChange?.changePercent)
      .filter((v): v is number => v !== undefined);
    const avgValueChange =
      valueChanges.length > 0
        ? Math.round(
            valueChanges.reduce((sum, v) => sum + v, 0) / valueChanges.length,
          )
        : 0;
    return { totalSets: summaries.length, changedCount, avgValueChange, mostAnalysed };
  }, [summaries]);

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      switch (filter) {
        case "changed":
          return s.everChanged;
        case "gaining":
          return (s.valueChange?.changePercent ?? 0) > 0;
        case "losing":
          return (s.valueChange?.changePercent ?? 0) < 0;
        case "sell":
          return s.latest.recommendation === "SELL";
        case "hold":
          return s.latest.recommendation === "HOLD";
        default:
          return true;
      }
    });
  }, [summaries, filter]);

  const handleShareBestCall = async () => {
    const top = best[0];
    if (!top) return;
    const text = buildShareBestCallText(top, formatPrice);
    if (!text) return;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text, title: "My best LEGO investment call" });
        setShareStatus("Shared!");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareStatus("Copied to clipboard!");
      }
    } catch {
      setShareStatus(null);
      return;
    }
    setTimeout(() => setShareStatus(null), 2500);
  };

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader
        title="Recommendation History"
        subtitle="Track how your analysed sets have changed over time"
      />

      <main className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {!loaded ? (
          <p className="text-sm text-zinc-500">Loading history…</p>
        ) : summaries.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-lg font-semibold text-white">No analysis history yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Analyse a set from Search to start tracking recommendations over time.
            </p>
            <Link
              href="/"
              className="touch-target mt-6 inline-flex items-center justify-center rounded-lg bg-[#f59e0b] px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
            >
              Search sets
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Total sets analysed</p>
                <p className="mt-1 text-2xl font-bold text-white">{stats.totalSets}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Changed recommendations</p>
                <p className="mt-1 text-2xl font-bold text-[#f59e0b]">
                  {stats.changedCount}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Avg. value change</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    stats.avgValueChange >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {stats.avgValueChange >= 0 ? "+" : ""}
                  {stats.avgValueChange}%
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Most analysed set</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {stats.mostAnalysed?.setName ?? "—"}
                </p>
                <p className="text-xs text-zinc-500">
                  {stats.mostAnalysed
                    ? `${stats.mostAnalysed.analysisCount} times`
                    : ""}
                </p>
              </div>
            </div>

            {best.length > 0 && (
              <section className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-white">Your Best Calls</h2>
                  <button
                    type="button"
                    onClick={() => void handleShareBestCall()}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                  >
                    Share My Best Call
                  </button>
                </div>
                {shareStatus && (
                  <p className="mt-2 text-xs font-medium text-emerald-400">{shareStatus}</p>
                )}
                <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/50">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Set</th>
                        <th className="px-4 py-3">First Value</th>
                        <th className="px-4 py-3">Current</th>
                        <th className="px-4 py-3">Gain</th>
                        <th className="px-4 py-3">Days Held</th>
                      </tr>
                    </thead>
                    <tbody>
                      {best.map((entry) => (
                        <tr
                          key={entry.setNumber}
                          className="border-b border-zinc-800/60 last:border-0"
                        >
                          <td className="px-4 py-3 text-lg">
                            {MEDALS[entry.rank - 1] ?? entry.rank}
                          </td>
                          <td className="px-4 py-3 font-medium text-white">
                            {entry.setName}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {formatPrice(entry.valueChange?.firstValue ?? 0)}
                          </td>
                          <td className="px-4 py-3 text-[#f59e0b]">
                            {formatPrice(entry.valueChange?.currentValue ?? 0)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-400">
                            +{entry.valueChange?.changePercent ?? 0}%
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {entry.valueChange?.daysTracked ?? 0} days
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {worst.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-white">Your Worst Calls</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Sets that haven&apos;t performed as expected — consider reviewing these
                </p>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-600">
                        <th className="px-4 py-3">Set</th>
                        <th className="px-4 py-3">First Value</th>
                        <th className="px-4 py-3">Current</th>
                        <th className="px-4 py-3">Change</th>
                        <th className="px-4 py-3">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worst.map((entry) => (
                        <tr
                          key={entry.setNumber}
                          className="border-b border-zinc-800/40 last:border-0"
                        >
                          <td className="px-4 py-3 text-zinc-300">{entry.setName}</td>
                          <td className="px-4 py-3 text-zinc-500">
                            {formatPrice(entry.valueChange?.firstValue ?? 0)}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {formatPrice(entry.valueChange?.currentValue ?? 0)}
                          </td>
                          <td className="px-4 py-3 text-red-400/80">
                            {entry.valueChange?.changePercent ?? 0}%
                          </td>
                          <td className="px-4 py-3 text-zinc-600">
                            {entry.valueChange?.daysTracked ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {insights.length > 0 && (
              <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Insights
                </h2>
                <ul className="mt-3 space-y-2">
                  {insights.map((insight) => (
                    <li key={insight} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-[#f59e0b]" aria-hidden>
                        ✦
                      </span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`filter-chip rounded-lg px-3 text-xs font-semibold transition ${
                    filter === f.key
                      ? "bg-[#f59e0b] text-zinc-900"
                      : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <ul className="mt-6 space-y-4">
              {filtered.length === 0 ? (
                <li className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
                  No sets match this filter.
                </li>
              ) : (
                filtered.map((summary) => (
                  <HistorySetCard
                    key={summary.setNumber}
                    summary={summary}
                    formatPrice={formatPrice}
                  />
                ))
              )}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

function HistorySetCard({
  summary,
  formatPrice,
}: {
  summary: SetHistorySummary;
  formatPrice: (aud: number) => string;
}) {
  const catalogue = findSet(summary.setNumber);
  const trendInfo = getTrendIndicator(summary.trend);
  const vc = summary.valueChange;
  const isValidated = (vc?.changePercent ?? 0) > 0;
  const firstConf = summary.first.confidenceScore;
  const latestConf = summary.latest.confidenceScore;
  const confDelta = summary.confidenceDelta ?? 0;

  const retirementChanged = summary.retirementStatusChanged;
  const firstRetired = summary.first.retired ?? false;
  const firstRetiringSoon = summary.first.retiringSoon ?? false;
  const nowRetired = catalogue ? isSetRetired(catalogue) : false;
  const nowRetiringSoon = catalogue ? isSetRetiringSoon(catalogue) : false;

  return (
    <li
      className={`rounded-2xl border bg-zinc-900/50 p-5 transition hover:border-zinc-700 ${
        isValidated
          ? "border-l-4 border-l-emerald-500 border-emerald-500/20 bg-emerald-500/5"
          : "border-zinc-800"
      }`}
    >
      <div className="flex gap-4">
        <SetImage
          setNumber={summary.setNumber}
          setName={summary.setName}
          variant="thumb"
          className="h-16 w-16 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-bold text-[#f59e0b]">
                #{summary.setNumber}
              </p>
              <h2 className="text-lg font-semibold text-white">{summary.setName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  {summary.theme}
                </span>
                <span className="text-xs text-zinc-500">
                  Analysed {summary.analysisCount}{" "}
                  {summary.analysisCount === 1 ? "time" : "times"}
                </span>
              </div>
            </div>
            <RecBadge rec={summary.latest.recommendation} />
          </div>
        </div>
      </div>

      {isValidated && vc && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold text-emerald-400">
              +{vc.changePercent}% since you first analysed this
            </p>
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              ✦ Validated
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            First seen at {formatPrice(vc.firstValue)} · Now estimated{" "}
            {formatPrice(vc.currentValue)}
          </p>
        </div>
      )}

      {summary.holdToSellChange && (
        <div className="mt-4 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-3">
          <p className="text-sm font-semibold text-[#fbbf24]">
            ⚡ This set changed to SELL — time to act?
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Changed {formatHistoryDate(summary.holdToSellChange.date)} at{" "}
            {formatPrice(summary.holdToSellChange.valueTo)} · Now{" "}
            {formatPrice(summary.latest.estimatedValue)}
          </p>
        </div>
      )}

      {retirementChanged && catalogue && (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950/50 px-4 py-3">
          <p className="text-sm font-medium text-zinc-300">
            This set&apos;s retirement status changed since you first analysed it
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Was: {retirementLabel(firstRetired, firstRetiringSoon)} · Now:{" "}
            {retirementLabel(nowRetired, nowRetiringSoon)}
          </p>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Recommendation journey
        </p>
        <RecommendationJourneyTimeline journey={summary.journey} />
      </div>

      {vc && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span
            className={`font-semibold ${
              vc.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            Since first analysis: {vc.changeDollars >= 0 ? "+" : "-"}
            {formatPrice(Math.abs(vc.changeDollars))} ({vc.changePercent >= 0 ? "+" : ""}
            {vc.changePercent}%)
          </span>
          <span className="text-zinc-500">Tracked for {vc.daysTracked} days</span>
        </div>
      )}

      {summary.analysisCount >= 2 && (
        <p className={`mt-2 text-sm ${trendInfo.className}`}>
          {trendInfo.arrow} {trendInfo.label} · Confidence: {firstConf} → {latestConf}{" "}
          ({confDelta >= 0 ? "+" : ""}
          {confDelta}pts)
        </p>
      )}

      <div className="mt-4">
        <Link
          href={`/results?set=${encodeURIComponent(summary.setNumber)}&condition=sealed`}
          className="text-sm font-semibold text-[#f59e0b] hover:underline"
        >
          View Analysis →
        </Link>
      </div>
    </li>
  );
}
