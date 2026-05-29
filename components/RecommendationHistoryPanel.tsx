"use client";

import { useEffect, useMemo, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import { calculateConfidence, setDataFromLegoSet } from "@/lib/confidence";
import { RecommendationJourneyTimeline } from "@/components/RecommendationJourneyTimeline";
import { ValueSparkline } from "@/components/ValueSparkline";
import {
  formatHistoryDate,
  getConfidenceDeltaSinceFirst,
  getRecommendationChanges,
  getRecommendationHistory,
  getRecommendationJourney,
  getStableRecommendationDays,
  getTrend,
  getTrendIndicator,
  getValueChange,
  saveRecommendationSnapshot,
  type RecommendationTrend,
} from "@/lib/recommendationHistory";
import {
  opportunitySetFromLego,
  scoreOpportunity,
} from "@/lib/opportunityScoring";
import { useCurrency } from "@/src/lib/currencyContext";

function TrendBanner({ trend, delta }: { trend: RecommendationTrend; delta: number | null }) {
  const trendInfo = getTrendIndicator(trend);
  if (trend === "improving") {
    return (
      <p className={`text-sm font-semibold ${trendInfo.className}`}>
        {trendInfo.arrow} Improving Confidence
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
      <p className={`text-sm font-semibold ${trendInfo.className}`}>
        {trendInfo.arrow} Declining Confidence
        {delta !== null && delta !== 0 && (
          <span className="ml-2 font-normal text-zinc-400">
            {delta}pts since first analysis
          </span>
        )}
      </p>
    );
  }
  return (
    <p className={`text-sm font-semibold ${trendInfo.className}`}>
      {trendInfo.arrow} Stable
      {delta !== null && delta !== 0 && (
        <span className="ml-2 font-normal">
          {delta > 0 ? "+" : ""}
          {delta}pts since first analysis
        </span>
      )}
    </p>
  );
}

export function RecommendationHistoryPanel({
  analysis,
}: {
  analysis: Analysis;
}) {
  const { formatPrice } = useCurrency();
  const setNumber = analysis.set.number;
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    const setData = setDataFromLegoSet(
      analysis.set,
      analysis.recommendation,
      analysis.estimatedValue,
    );
    const confidence = calculateConfidence(setData, analysis.condition);
    const opportunity = scoreOpportunity(
      opportunitySetFromLego(
        analysis.set,
        analysis.recommendation,
        analysis.estimatedValue,
      ),
    );
    saveRecommendationSnapshot(
      setNumber,
      setData,
      analysis.condition,
      confidence.score,
      analysis.estimatedValue,
      analysis.set.msrp,
      opportunity.opportunityScore,
    );
    setHistoryVersion((v) => v + 1);
  }, [analysis, setNumber]);

  const history = useMemo(
    () => getRecommendationHistory(setNumber),
    [setNumber, historyVersion],
  );
  const journey = useMemo(
    () => getRecommendationJourney(setNumber),
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
  const valueChange = useMemo(
    () => getValueChange(setNumber),
    [setNumber, historyVersion],
  );

  const firstSnapshot = history[history.length - 1];
  const latestRec = analysis.recommendation;
  const gainedSinceFirst = (valueChange?.changePercent ?? 0) > 0;
  const stableValue =
    valueChange && Math.abs(valueChange.changePercent) < 5;

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

          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Journey
            </p>
            <div className="-mx-2 overflow-x-auto px-2 pb-2">
              <RecommendationJourneyTimeline
                journey={journey}
                showValues
                formatPrice={formatPrice}
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Value over time
            </p>
            <ValueSparkline snapshots={history} />
          </div>

          {valueChange && firstSnapshot && (
            <div
              className={`mt-6 rounded-xl border px-4 py-4 ${
                gainedSinceFirst
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-zinc-800 bg-zinc-950/50"
              }`}
            >
              <p
                className={`text-lg font-bold ${
                  valueChange.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {valueChange.changePercent >= 0 ? "+" : ""}
                {valueChange.changePercent}% since you first analysed this set
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                First seen: {formatHistoryDate(firstSnapshot.date)} at{" "}
                {formatPrice(valueChange.firstValue)} · Now:{" "}
                {formatPrice(valueChange.currentValue)}
              </p>
              {latestRec === "SELL" && gainedSinceFirst && (
                <p className="mt-2 text-sm font-medium text-emerald-400">
                  ✦ Strong call — this set has appreciated since you first noticed it
                </p>
              )}
              {latestRec === "HOLD" && stableValue && (
                <p className="mt-2 text-sm text-zinc-500">
                  Your patience is holding — value stable since first analysis
                </p>
              )}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-400">
            Analysed {history.length} times · First seen{" "}
            {formatHistoryDate(firstSnapshot.date)}
            {changes.length === 0 && stableDays !== null ? (
              <>
                {" "}
                · Recommendation stable for {stableDays}{" "}
                {stableDays === 1 ? "day" : "days"}
              </>
            ) : (
              <span className="mt-1 block font-semibold text-[#fbbf24]">
                ⚡ Recommendation has changed {changes.length}{" "}
                {changes.length === 1 ? "time" : "times"} — monitor closely
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
