import type { Analysis } from "@/lib/analyze";
import {
  calculateConfidence,
  getConfidenceBand,
  getConfidenceStyling,
  setDataFromLegoSet,
  type ConfidenceFactor,
} from "@/lib/confidence";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceContribution {
  label: string;
  points: number;
  icon: "✦" | "✕";
}

export interface ConfidenceResult {
  score: number;
  contributions: ConfidenceContribution[];
  level: ConfidenceLevel;
  label: string;
  barClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  factors: ConfidenceFactor[];
}

function toBarClass(color: string): string {
  if (color.includes("emerald")) return "bg-emerald-500";
  if (color.includes("green")) return "bg-green-500";
  if (color.includes("amber")) return "bg-amber-500";
  if (color.includes("orange")) return "bg-orange-500";
  return "bg-red-500";
}

export function getConfidenceLevel(score: number): {
  level: ConfidenceLevel;
  label: string;
  barClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
} {
  const styling = getConfidenceStyling(score);
  return {
    level: getConfidenceBand(score),
    label: styling.label,
    barClass: toBarClass(styling.color),
    textClass: styling.color,
    bgClass: styling.bgColor,
    borderClass: styling.borderColor,
  };
}

export function computeConfidenceScore(analysis: Analysis): ConfidenceResult {
  const result = calculateConfidence(
    setDataFromLegoSet(
      analysis.set,
      analysis.recommendation,
      analysis.estimatedValue,
    ),
    analysis.condition,
  );

  const styling = getConfidenceLevel(result.score);

  return {
    score: result.score,
    contributions: result.factors.map((f) => ({
      label: f.label,
      points: f.points,
      icon: f.positive ? "✦" : "✕",
    })),
    level: styling.level,
    label: result.label,
    barClass: styling.barClass,
    textClass: styling.textClass,
    bgClass: styling.bgClass,
    borderClass: styling.borderClass,
    factors: result.factors,
  };
}
