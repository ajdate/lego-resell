"use client";

import Link from "next/link";
import type { Recommendation } from "@/lib/analyze";
import {
  getRecommendationHistory,
  getTrendIndicator,
  getTrend,
} from "@/lib/recommendationHistory";

export function SetHistoryIndicators({
  setNumber,
  recommendationAtAdd,
  currentRecommendation,
  showAnalysisCount = false,
  showHistoryLink = false,
}: {
  setNumber: string;
  recommendationAtAdd: Recommendation;
  currentRecommendation: Recommendation;
  showAnalysisCount?: boolean;
  showHistoryLink?: boolean;
}) {
  const history = getRecommendationHistory(setNumber);
  const trend = getTrend(setNumber);
  const trendInfo = getTrendIndicator(trend);
  const recChangedSinceAdd =
    recommendationAtAdd !== currentRecommendation;

  if (history.length === 0 && !recChangedSinceAdd) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {history.length >= 2 && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-950/60 px-2 py-0.5 text-xs font-bold ${trendInfo.className}`}
          title={trendInfo.label}
        >
          {trendInfo.arrow}
        </span>
      )}
      {recChangedSinceAdd && (
        <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-xs font-bold text-[#f59e0b]">
          ⚡ Rec. Changed
        </span>
      )}
      {showAnalysisCount && history.length > 0 && (
        <span className="text-xs text-zinc-500">
          Analysed {history.length}{" "}
          {history.length === 1 ? "time" : "times"}
        </span>
      )}
      {showHistoryLink && (
        <Link
          href={`/results?set=${encodeURIComponent(setNumber)}&condition=sealed`}
          className="text-xs font-semibold text-[#f59e0b] hover:underline"
        >
          View Full History →
        </Link>
      )}
    </div>
  );
}
