"use client";

import { useEffect, useMemo, useState } from "react";
import type { Analysis, Condition, Recommendation } from "@/lib/analyze";
import { calculateConfidence, setDataFromLegoSet } from "@/lib/confidence";
import { getConfidenceStyling } from "@/lib/confidence";
import {
  formatHistoryDate,
  getConfidenceDeltaSinceFirst,
  getRecommendationChanges,
  getRecommendationHistory,
  getStableRecommendationDays,
  getTrend,
  saveRecommendationSnapshot,
  type RecommendationSnapshot,
  type RecommendationTrend,
} from "@/lib/recommendationHistory";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function RecBadge({ rec }: { rec: Recommendation }) {
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

function conditionLabel(condition: string) {
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function TrendBanner({ trend, delta }: { trend: RecommendationTrend; delta: number | null }) {
  if (trend === "improving") {
    return (
      <p className="text-sm font-semibold text-emerald-400">
        📈 Improving Confidence
        {delta !== null && delta !== 0 && (
          <span className="ml-2 font-normal text-zinc-400">
            {delta > 0 ? "+" : ""}
            {delta}pts since first analysis
          </span>
        )}
      </p>
    );
  }
  if (trend === "declining") {
    return (
      <p className="text-sm font-semibold text-red-400">
        📉 Declining Confidence
        {delta !== null && delta !== 0 && (
          <span className="ml-2 font-normal text-zinc-400">
            {delta}pts since first analysis
          </span>
        )}
      </p>
    );
  }
  return (
    <p className="text-sm font-semibold text-zinc-500">
      → Stable
      {delta !== null && delta !== 0 && (
        <span className="ml-2 font-normal">
          {delta > 0 ? "+" : ""}
          {delta}pts since first analysis
        </span>
      )}
    </p>
  );
}

function TimelineEntry({
  snapshot,
  previous,
}: {
  snapshot: RecommendationSnapshot;
  previous: RecommendationSnapshot | null;
}) {
  const isSell = snapshot.recommendation === "SELL";
  const styling = getConfidenceStyling(snapshot.confidenceScore);
  const recChanged =
    previous && previous.recommendation !== snapshot.recommendation;
  const confidenceDelta = previous
    ? snapshot.confidenceScore - previous.confidenceScore
    : 0;
  const significantConfidence = Math.abs(confidenceDelta) >= 10;

  const dotClass = recChanged
    ? "bg-[#f59e0b] ring-2 ring-[#f59e0b]/30"
    : isSell
      ? "bg-emerald-500"
      : "bg-[#f59e0b]";

  return (
    <li className="relative pb-8 pl-8 last:pb-0">
      <span
        className={`absolute left-0 top-1.5 h-3 w-3 -translate-x-[7px] rounded-full ${dotClass}`}
        aria-hidden
      />
      <p className="text-sm font-medium text-white">
        {formatHistoryDate(snapshot.date)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RecBadge rec={snapshot.recommendation} />
        <span className={`text-sm font-bold ${styling.color}`}>
          {snapshot.confidenceScore}/100
        </span>
        <span className="text-sm text-[#f59e0b]">
          {formatUsd(snapshot.estimatedValue)}
        </span>
        <span className="text-xs text-zinc-500">
          {conditionLabel(snapshot.condition)}
        </span>
      </div>
      {recChanged && previous && (
        <p className="mt-2 text-xs font-semibold text-[#fbbf24]">
          ⚡ Changed from {previous.recommendation} to {snapshot.recommendation}
        </p>
      )}
      {significantConfidence && previous && (
        <p
          className={`mt-1 text-xs font-semibold ${
            confidenceDelta > 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {confidenceDelta > 0 ? "↑" : "↓"} {confidenceDelta > 0 ? "+" : ""}
          {confidenceDelta}pts
        </p>
      )}
    </li>
  );
}

export function RecommendationHistoryPanel({
  analysis,
}: {
  analysis: Analysis;
}) {
  const setNumber = analysis.set.number;
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    const confidence = calculateConfidence(
      setDataFromLegoSet(
        analysis.set,
        analysis.recommendation,
        analysis.estimatedValue,
      ),
      analysis.condition,
    );
    saveRecommendationSnapshot(
      setNumber,
      setDataFromLegoSet(
        analysis.set,
        analysis.recommendation,
        analysis.estimatedValue,
      ),
      analysis.condition,
      confidence.score,
      analysis.estimatedValue,
      analysis.set.msrp,
    );
    setHistoryVersion((v) => v + 1);
  }, [analysis, setNumber]);

  const history = useMemo(
    () => getRecommendationHistory(setNumber),
    [setNumber, historyVersion],
  );
  const changes = useMemo(
    () => getRecommendationChanges(setNumber),
    [setNumber, historyVersion],
  );
  const trend = useMemo(() => getTrend(setNumber), [setNumber, historyVersion]);
  const delta = useMemo(
    () => getConfidenceDeltaSinceFirst(setNumber),
    [setNumber, historyVersion],
  );
  const stableDays = useMemo(
    () => getStableRecommendationDays(setNumber),
    [setNumber, historyVersion],
  );

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        <span aria-hidden>🕐</span>
        Recommendation History
      </h2>

      {history.length < 2 ? (
        <p className="mt-4 text-sm text-zinc-500">
          First time viewing this set — check back after analysing again to see
          trends
        </p>
      ) : (
        <>
          <div className="mt-4">
            <TrendBanner trend={trend} delta={delta} />
          </div>

          <ol className="relative mt-6 ml-3 border-l-2 border-white/10">
            {history.map((snap, index) => (
              <TimelineEntry
                key={`${snap.date}-${index}`}
                snapshot={snap}
                previous={history[index + 1] ?? null}
              />
            ))}
          </ol>

          <div className="mt-6 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-400">
            Analysed {history.length} times · First seen{" "}
            {formatHistoryDate(history[history.length - 1].date)}
            {changes.length === 0 && stableDays !== null ? (
              <>
                {" "}
                · Recommendation stable for {stableDays}{" "}
                {stableDays === 1 ? "day" : "days"}
              </>
            ) : (
              <span className="mt-1 block font-semibold text-[#fbbf24]">
                ⚠️ Recommendation has changed {changes.length}{" "}
                {changes.length === 1 ? "time" : "times"} — monitor closely
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
