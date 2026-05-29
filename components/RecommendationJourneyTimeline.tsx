"use client";

import type { Recommendation } from "@/lib/analyze";
import {
  formatHistoryDateShort,
  type Journey,
} from "@/lib/recommendationHistory";

function recDotClass(rec: Recommendation): string {
  return rec === "SELL" ? "bg-emerald-500" : "bg-[#f59e0b]";
}

function recLineClass(rec: Recommendation): string {
  return rec === "SELL" ? "bg-emerald-500/60" : "bg-[#f59e0b]/60";
}

function RecBadge({ rec }: { rec: Recommendation }) {
  const isSell = rec === "SELL";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
        isSell
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-[#f59e0b]/20 text-[#f59e0b]"
      }`}
    >
      {rec}
    </span>
  );
}

type RecommendationJourneyTimelineProps = {
  journey: Journey;
  compact?: boolean;
  showValues?: boolean;
  formatPrice?: (aud: number) => string;
};

export function RecommendationJourneyTimeline({
  journey,
  compact = false,
  showValues = false,
  formatPrice,
}: RecommendationJourneyTimelineProps) {
  if (journey.length === 0) return null;

  if (journey.length === 1) {
    const step = journey[0];
    return (
      <div className="flex flex-col items-start gap-2">
        <RecBadge rec={step.recommendation} />
        <span
          className={`h-3 w-3 rounded-full ${recDotClass(step.recommendation)}`}
        />
        <span className="text-xs text-zinc-500">
          {formatHistoryDateShort(step.date)}
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto pb-1 ${compact ? "" : "px-1"}`}>
      <div className="flex min-w-max items-start">
        {journey.map((step, index) => {
          const isFirst = index === 0;
          const lineRec = step.recommendation;

          return (
            <div key={`${step.date}-${index}`} className="flex items-start">
              {!isFirst && (
                <div className="flex flex-col items-center pt-[38px]">
                  {step.recChangedFromPrevious && (
                    <span className="absolute -mt-6 text-[10px] font-semibold text-[#fbbf24]">
                      ⚡
                    </span>
                  )}
                  <div
                    className={`h-0.5 w-8 sm:w-12 ${recLineClass(lineRec)}`}
                  />
                </div>
              )}
              <div
                className={`flex flex-col items-center ${compact ? "min-w-[64px]" : "min-w-[80px]"}`}
              >
                {step.recChangedFromPrevious && (
                  <span className="mb-1 text-[10px] font-semibold text-[#fbbf24]">
                    ⚡ Changed
                  </span>
                )}
                {!step.recChangedFromPrevious && !isFirst && (
                  <span className="mb-1 h-[14px]" aria-hidden />
                )}
                {isFirst && !step.recChangedFromPrevious && (
                  <span className="mb-1 h-[14px]" aria-hidden />
                )}
                <RecBadge rec={step.recommendation} />
                <span
                  className={`mt-1.5 h-3 w-3 rounded-full ${recDotClass(step.recommendation)}`}
                />
                <span className="mt-2 text-center text-[10px] text-zinc-500">
                  {formatHistoryDateShort(step.date)}
                </span>
                {showValues && formatPrice && (
                  <>
                    <span className="mt-0.5 text-center text-[10px] font-medium text-[#f59e0b]">
                      {formatPrice(step.estimatedValue)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {step.confidenceScore}pts
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
