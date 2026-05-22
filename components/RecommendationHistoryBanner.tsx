"use client";

import { useEffect, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import type { Recommendation } from "@/lib/analyze";
import { computeConfidenceScore } from "@/lib/recommendation-confidence";
import {
  formatHistoryDate,
  recordRecommendationView,
  type RecommendationHistoryEntry,
} from "@/lib/recommendation-history";

export function RecommendationHistoryBanner({
  analysis,
}: {
  analysis: Analysis;
}) {
  const [previous, setPrevious] = useState<RecommendationHistoryEntry | null>(
    null,
  );
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    const confidence = computeConfidenceScore(analysis);
    const prior = recordRecommendationView({
      setNumber: analysis.set.number,
      recommendation: analysis.recommendation,
      confidenceScore: confidence.score,
      date: new Date().toISOString(),
    });
    setPrevious(prior ?? null);
    setRecorded(true);
  }, [analysis]);

  if (!recorded || !previous) return null;

  const recommendationChanged =
    previous.recommendation !== analysis.recommendation;

  return (
    <div
      className={`mt-6 rounded-2xl border p-4 ${
        recommendationChanged
          ? "border-[#f59e0b]/40 bg-[#f59e0b]/[0.06]"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Recommendation History
      </h3>
      <p className="mt-2 text-sm text-zinc-300">
        Previously viewed on {formatHistoryDate(previous.date)} — recommendation
        was{" "}
        <RecPill rec={previous.recommendation} /> (confidence{" "}
        {previous.confidenceScore}/100)
      </p>
      {recommendationChanged && (
        <p
          className="mt-2 text-sm font-semibold text-[#fbbf24]"
          role="alert"
        >
          ⚠️ Recommendation changed since your last visit — was{" "}
          {previous.recommendation}, now {analysis.recommendation}
        </p>
      )}
    </div>
  );
}

function RecPill({ rec }: { rec: Recommendation }) {
  const isSell = rec === "SELL";
  return (
    <span
      className={`inline rounded px-1.5 py-0.5 text-xs font-bold ${
        isSell
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-amber-500/20 text-amber-400"
      }`}
    >
      {rec}
    </span>
  );
}
