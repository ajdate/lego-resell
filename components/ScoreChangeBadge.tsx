"use client";

import { useEffect, useState } from "react";
import {
  getPreviousView,
  recordRecommendationView,
} from "@/lib/recommendation-history";
import type { Recommendation } from "@/lib/analyze";

export function ScoreChangeBadge({
  setNumber,
  currentScore,
  recommendation,
}: {
  setNumber: string;
  currentScore: number;
  recommendation: Recommendation;
}) {
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const previous = getPreviousView(setNumber);
    recordRecommendationView({
      setNumber,
      recommendation,
      confidenceScore: currentScore,
      date: new Date().toISOString(),
    });
    if (previous && previous.confidenceScore !== currentScore) {
      setDelta(currentScore - previous.confidenceScore);
    }
  }, [setNumber, currentScore, recommendation]);

  if (delta === null || delta === 0) return null;

  const improved = delta > 0;
  return (
    <p
      className={`mt-2 text-center text-xs font-semibold sm:text-left ${
        improved ? "text-emerald-400" : "text-red-400"
      }`}
    >
      Score changed {improved ? "↑" : "↓"} {improved ? "+" : ""}
      {delta}pts since last visit
    </p>
  );
}
