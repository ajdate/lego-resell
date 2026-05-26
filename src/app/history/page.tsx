"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ConfidenceCompactBadge } from "@/components/ConfidenceDisplay";
import { findSet } from "@/lib/analyze";
import { calculateConfidence, setDataFromLegoSet } from "@/lib/confidence";
import {
  formatHistoryDate,
  getGlobalHistorySummaries,
  getTrendIndicator,
  type SetHistorySummary,
} from "@/lib/recommendationHistory";

type HistoryFilter =
  | "all"
  | "changed"
  | "stable"
  | "sell"
  | "hold"
  | "improving"
  | "declining";

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "changed", label: "Changed" },
  { key: "stable", label: "Stable" },
  { key: "sell", label: "SELL" },
  { key: "hold", label: "HOLD" },
  { key: "improving", label: "Improving" },
  { key: "declining", label: "Declining" },
];

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
  const [summaries, setSummaries] = useState<SetHistorySummary[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setSummaries(getGlobalHistorySummaries());
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    if (summaries.length === 0) {
      return {
        totalSets: 0,
        changedCount: 0,
        mostAnalysed: null as SetHistorySummary | null,
        avgConfidence: 0,
      };
    }
    const changedCount = summaries.filter((s) => s.everChanged).length;
    const mostAnalysed = summaries.reduce((best, s) =>
      s.analysisCount > (best?.analysisCount ?? 0) ? s : best,
    );
    const avgConfidence =
      summaries.reduce((sum, s) => sum + s.latest.confidenceScore, 0) /
      summaries.length;
    return {
      totalSets: summaries.length,
      changedCount,
      mostAnalysed,
      avgConfidence: Math.round(avgConfidence),
    };
  }, [summaries]);

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      switch (filter) {
        case "changed":
          return s.everChanged;
        case "stable":
          return !s.everChanged;
        case "sell":
          return s.latest.recommendation === "SELL";
        case "hold":
          return s.latest.recommendation === "HOLD";
        case "improving":
          return s.trend === "improving";
        case "declining":
          return s.trend === "declining";
        default:
          return true;
      }
    });
  }, [summaries, filter]);

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader
        title="Analysis History"
        subtitle="All sets you have previously analysed"
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
                <p className="text-xs text-zinc-500">Sets analysed</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stats.totalSets}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Changed recommendations</p>
                <p className="mt-1 text-2xl font-bold text-[#f59e0b]">
                  {stats.changedCount}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Most analysed</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {stats.mostAnalysed
                    ? findSet(stats.mostAnalysed.setNumber)?.name ??
                      `#${stats.mostAnalysed.setNumber}`
                    : "—"}
                </p>
                <p className="text-xs text-zinc-500">
                  {stats.mostAnalysed
                    ? `${stats.mostAnalysed.analysisCount} times`
                    : ""}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Avg. confidence</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stats.avgConfidence}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
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
                  <HistorySetCard key={summary.setNumber} summary={summary} />
                ))
              )}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

function HistorySetCard({ summary }: { summary: SetHistorySummary }) {
  const catalogue = findSet(summary.setNumber);
  const name = catalogue?.name ?? `Set #${summary.setNumber}`;
  const trendInfo = getTrendIndicator(summary.trend);
  const confidence = catalogue
    ? calculateConfidence(
        setDataFromLegoSet(
          catalogue,
          summary.latest.recommendation,
          summary.latest.estimatedValue,
        ),
        "sealed",
      )
    : null;

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold text-[#f59e0b]">
            {summary.setNumber}
          </p>
          <h2 className="text-lg font-semibold text-white">{name}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Analysed {summary.analysisCount}{" "}
            {summary.analysisCount === 1 ? "time" : "times"} · First seen{" "}
            {formatHistoryDate(summary.firstDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary.analysisCount >= 2 && (
            <span
              className={`text-lg font-bold ${trendInfo.className}`}
              title={trendInfo.label}
            >
              {trendInfo.arrow}
            </span>
          )}
          <RecBadge rec={summary.latest.recommendation} />
          {confidence && <ConfidenceCompactBadge result={confidence} />}
          {summary.everChanged ? (
            <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-xs font-bold text-[#f59e0b]">
              Changed
            </span>
          ) : (
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              Stable
            </span>
          )}
        </div>
      </div>
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
