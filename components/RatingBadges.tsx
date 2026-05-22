"use client";

import {
  generateExplanation,
  explanationSetFromLegoSet,
  getRatingTooltip,
  ratingBadgeClassName,
  type ExplanationSetData,
  type ExplanationResult,
} from "@/lib/explanations";

function RatingPill({
  label,
  rating,
  kind,
  compact,
}: {
  label: string;
  rating: string;
  kind: "scarcity" | "demand" | "liquidity" | "risk";
  compact?: boolean;
}) {
  return (
    <span
      title={getRatingTooltip(kind, rating)}
      className={`inline-flex cursor-help rounded-full px-2 py-0.5 font-semibold ${compact ? "text-xs" : "text-xs"} ${ratingBadgeClassName(kind, rating)}`}
    >
      {compact ? rating : `${label}: ${rating}`}
    </span>
  );
}

export function ExplanationRatingsRow({
  explanation,
  compact = false,
}: {
  explanation: ExplanationResult;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-1.5">
      <RatingPill
        label="Scarcity"
        rating={explanation.scarcityRating}
        kind="scarcity"
        compact={compact}
      />
      <RatingPill
        label="Demand"
        rating={explanation.demandRating}
        kind="demand"
        compact={compact}
      />
      <RatingPill
        label="Liquidity"
        rating={explanation.liquidityRating}
        kind="liquidity"
        compact={compact}
      />
      <RatingPill
        label="Risk"
        rating={explanation.riskRating}
        kind="risk"
        compact={compact}
      />
    </div>
  );
}

export function ScarcityDemandBadges({
  set,
  condition,
  confidenceScore,
}: {
  set: ExplanationSetData;
  condition: string;
  confidenceScore: number;
}) {
  const explanation = generateExplanation(set, condition, confidenceScore);
  return (
    <div className="flex flex-wrap gap-1.5">
      <RatingPill
        label="Scarcity"
        rating={explanation.scarcityRating}
        kind="scarcity"
        compact
      />
      <RatingPill
        label="Demand"
        rating={explanation.demandRating}
        kind="demand"
        compact
      />
    </div>
  );
}

export function PortfolioRatingBadges({
  set,
  condition,
  confidenceScore,
}: {
  set: ExplanationSetData;
  condition: string;
  confidenceScore: number;
}) {
  const explanation = generateExplanation(set, condition, confidenceScore);
  return <ExplanationRatingsRow explanation={explanation} compact />;
}

export { explanationSetFromLegoSet };
