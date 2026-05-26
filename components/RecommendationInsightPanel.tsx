"use client";

import { useMemo, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import { isSetRetired } from "@/lib/analyze";
import {
  ConfidenceBreakdown,
  ConfidenceRingBadge,
} from "@/components/ConfidenceDisplay";
import { ExplanationRatingsRow } from "@/components/RatingBadges";
import { calculateConfidence, setDataFromLegoSet } from "@/lib/confidence";
import {
  explanationSetFromLegoSet,
  generateExplanation,
  groupFactorsByCategory,
  type Factor,
  type FactorImpact,
} from "@/lib/explanations";

import { useCurrency } from "@/src/lib/currencyContext";

function conditionLabel(condition: string) {
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function impactLabel(impact: FactorImpact): string {
  switch (impact) {
    case "positive":
      return "Positive";
    case "negative":
      return "Negative";
    default:
      return "Neutral";
  }
}

function impactBadgeClass(impact: FactorImpact): string {
  switch (impact) {
    case "positive":
      return "bg-emerald-500/15 text-emerald-400";
    case "negative":
      return "bg-red-500/15 text-red-400";
    default:
      return "bg-zinc-700/80 text-zinc-400";
  }
}

function factorBorderClass(impact: FactorImpact): string {
  switch (impact) {
    case "positive":
      return "border-l-emerald-500";
    case "negative":
      return "border-l-red-500";
    default:
      return "border-l-zinc-600";
  }
}

function formatWeight(weight: number): string {
  const sign = weight > 0 ? "+" : "";
  return `${sign}${weight}pts`;
}

function ExpandableFactorRow({ factor }: { factor: Factor }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-lg border border-zinc-800/80 border-l-4 bg-zinc-950/40 ${factorBorderClass(factor.impact)}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className="mt-0.5 shrink-0 text-base" aria-hidden>
          {factor.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-white">{factor.title}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${impactBadgeClass(factor.impact)}`}
            >
              {impactLabel(factor.impact)}
            </span>
            <span className="text-xs text-zinc-500">
              {formatWeight(factor.weight)}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <p className="border-t border-zinc-800/60 px-4 pb-3 pl-11 text-sm leading-relaxed text-zinc-400">
          {factor.explanation}
        </p>
      )}
    </div>
  );
}

export function RecommendationInsightPanel({
  analysis,
}: {
  analysis: Analysis;
}) {
  const { formatPrice } = useCurrency();
  const [rationaleOpen, setRationaleOpen] = useState(false);
  const isSell = analysis.recommendation === "SELL";
  const isRetired = isSetRetired(analysis.set);
  const confidence = useMemo(
    () =>
      calculateConfidence(
        setDataFromLegoSet(
          analysis.set,
          analysis.recommendation,
          analysis.estimatedValue,
        ),
        analysis.condition,
      ),
    [analysis],
  );

  const explanation = useMemo(() => {
    const setData = explanationSetFromLegoSet(
      {
        name: analysis.set.name,
        theme: analysis.set.theme,
        pieces: analysis.set.pieces,
        year: analysis.set.year,
        retired: analysis.set.retired,
        retiringSoon: analysis.set.retiringSoon,
      },
      analysis.recommendation,
      analysis.estimatedValue,
    );
    return generateExplanation(
      setData,
      analysis.condition,
      confidence.score,
    );
  }, [analysis, confidence.score]);

  const groupedFactors = useMemo(
    () => groupFactorsByCategory(explanation.factors),
    [explanation.factors],
  );

  const summaryBorder = isSell ? "border-emerald-500" : "border-amber-500";

  return (
    <div
      className={`mt-6 rounded-2xl border ${
        isSell
          ? "border-emerald-800/60 bg-emerald-950/30"
          : "border-amber-800/60 bg-amber-950/30"
      }`}
    >
      <div className="border-b border-zinc-800/80 p-6">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`w-full rounded-xl px-4 py-3 text-center text-lg font-bold tracking-wide sm:w-auto sm:py-2 ${
              isSell
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {analysis.recommendation}
          </span>
          <div className="flex justify-center sm:justify-end">
            <ConfidenceRingBadge result={confidence} />
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          {analysis.roiPercent}% above MSRP ({formatPrice(analysis.set.msrp)}) ·{" "}
          {conditionLabel(analysis.condition)} condition
        </p>
        {isRetired && (
          <p className="mt-1 text-xs font-semibold text-[#f59e0b]">
            {isSell
              ? "Retired · Strong market now"
              : "Retired · Appreciating"}
          </p>
        )}

        <div className="mt-5">
          <ConfidenceBreakdown result={confidence} />
        </div>

        <button
          type="button"
          onClick={() => setRationaleOpen((o) => !o)}
          className="mt-4 text-sm font-medium text-[#f59e0b] transition hover:text-[#fbbf24]"
        >
          {rationaleOpen ? "Hide Full Rationale" : "View Full Rationale"}
        </button>

        {rationaleOpen && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Assessment
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              {analysis.reasoning}
            </p>
          </div>
        )}
      </div>

      <div className="border-b border-zinc-800/80 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
          Recommendation Explanation
        </h3>

        <div className="mt-4">
          <ExplanationRatingsRow explanation={explanation} />
        </div>

        <div
          className={`mt-5 rounded-xl border border-zinc-800/80 border-l-4 bg-zinc-950/50 p-4 ${summaryBorder}`}
        >
          <p className="text-base leading-relaxed text-white/80">
            {explanation.summary}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {groupedFactors.map(({ category, factors }) => (
            <div key={category}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {category}
              </h4>
              <div className="space-y-2">
                {factors.map((factor) => (
                  <ExpandableFactorRow
                    key={`${category}-${factor.title}`}
                    factor={factor}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-zinc-800/80 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
          Market Context
        </h3>
        <div className="mt-3 rounded-xl bg-white/[0.02] p-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            {explanation.marketContext}
          </p>
        </div>
      </div>

      <div className="p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
          <span aria-hidden>🕐</span>
          Timing Advice
        </h3>
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm leading-relaxed text-[#fbbf24]">
            {explanation.timingAdvice}
          </p>
        </div>
      </div>
    </div>
  );
}
