import type { ConfidenceFactor } from "@/lib/confidence";
import type { OpportunityFactor } from "@/lib/opportunityScoring";

export type ScoreFactor = {
  label: string;
  explanation: string;
  points: number;
  positive: boolean;
};

export function toScoreFactors(
  factors: ConfidenceFactor[] | OpportunityFactor[],
): ScoreFactor[] {
  return factors.map((f) => ({
    label: f.label,
    explanation: f.explanation,
    points: f.points,
    positive: f.positive,
  }));
}

export type ScoreColorSet = {
  label: string;
  text: string;
  fill: string;
  ring: string;
  pillPositive: string;
  pillNegative: string;
};

export function getScoreColorSet(score: number): ScoreColorSet {
  if (score >= 80) {
    return {
      label: "Very High",
      text: "text-emerald-400",
      fill: "#34d399",
      ring: "border-emerald-500/30",
      pillPositive: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
      pillNegative: "bg-red-500/15 text-red-300 border-red-500/25",
    };
  }
  if (score >= 65) {
    return {
      label: "High",
      text: "text-green-400",
      fill: "#4ade80",
      ring: "border-green-500/30",
      pillPositive: "bg-green-500/15 text-green-300 border-green-500/25",
      pillNegative: "bg-red-500/15 text-red-300 border-red-500/25",
    };
  }
  if (score >= 50) {
    return {
      label: "Medium",
      text: "text-amber-400",
      fill: "#fbbf24",
      ring: "border-amber-500/30",
      pillPositive: "bg-amber-500/15 text-amber-200 border-amber-500/25",
      pillNegative: "bg-red-500/15 text-red-300 border-red-500/25",
    };
  }
  if (score >= 35) {
    return {
      label: "Low",
      text: "text-orange-400",
      fill: "#fb923c",
      ring: "border-orange-500/30",
      pillPositive: "bg-orange-500/15 text-orange-200 border-orange-500/25",
      pillNegative: "bg-red-500/15 text-red-300 border-red-500/25",
    };
  }
  return {
    label: "Very Low",
    text: "text-red-400",
    fill: "#f87171",
    ring: "border-red-500/30",
    pillPositive: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
    pillNegative: "bg-red-500/15 text-red-300 border-red-500/25",
  };
}

export function getFullScoreLabel(
  score: number,
  kind: "confidence" | "opportunity",
): string {
  const colors = getScoreColorSet(score);
  if (kind === "confidence") {
    if (score >= 80) return "Very High Confidence";
    if (score >= 65) return "High Confidence";
    if (score >= 50) return "Medium Confidence";
    if (score >= 35) return "Low Confidence";
    return "Very Low Confidence";
  }
  if (score >= 80) return "Exceptional Opportunity";
  if (score >= 60) return "Strong Opportunity";
  if (score >= 40) return "Good Opportunity";
  if (score >= 20) return "Moderate Opportunity";
  return "Low Opportunity";
}

export function factorIcon(positive: boolean, points: number): string {
  if (!positive && points < 0) return "✕";
  if (positive) return "✦";
  return "⚠";
}

export function formatPointsBadge(points: number): string {
  const sign = points >= 0 ? "+" : "";
  return `${sign}${points}pts`;
}

const MAX_BAR = 35;

export function factorBarWidth(points: number): number {
  const abs = Math.abs(points);
  return Math.min(100, Math.round((abs / MAX_BAR) * 100));
}

export function buildScoreSummary(factors: ScoreFactor[]): string {
  const positives = factors
    .filter((f) => f.positive && f.points > 0)
    .sort((a, b) => b.points - a.points);
  const negatives = factors
    .filter((f) => !f.positive && f.points < 0)
    .sort((a, b) => a.points - b.points);

  if (positives.length === 0 && negatives.length === 0) {
    return "This score reflects standard catalogue data with no major positive or negative drivers applied.";
  }

  const parts: string[] = [];

  if (positives.length >= 2) {
    parts.push(
      `This set scores highly due to ${positives[0].label.toLowerCase()} and ${positives[1].label.toLowerCase()}.`,
    );
  } else if (positives.length === 1) {
    parts.push(
      `The main strength is ${positives[0].label.toLowerCase()} — ${positives[0].explanation.split(".")[0].toLowerCase()}.`,
    );
  }

  if (positives.length >= 3) {
    const third = positives[2];
    parts.push(
      `${third.label} adds a further ${third.points > 0 ? "boost" : "consideration"}.`,
    );
  }

  if (negatives.length >= 1) {
    const n = negatives[0];
    const prefix = parts.length > 0 ? "The main drag" : "The score is weighed down";
    parts.push(
      `${prefix} is ${n.label.toLowerCase()} (${formatPointsBadge(n.points)}).`,
    );
  } else if (parts.length > 0) {
    parts.push("No significant negative factors were applied.");
  }

  return parts.join(" ");
}

export function topFactorLabels(
  factors: ScoreFactor[],
  limit = 3,
): ScoreFactor[] {
  return [...factors]
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, limit);
}

export type FactorAdvantage = {
  label: string;
  points: number;
  explanation: string;
};

export function compareFactorAdvantages(
  factorsA: ScoreFactor[],
  factorsB: ScoreFactor[],
  labelA: string,
  labelB: string,
): { aAdvantages: FactorAdvantage[]; bAdvantages: FactorAdvantage[] } {
  const mapA = new Map(factorsA.map((f) => [f.label, f]));
  const mapB = new Map(factorsB.map((f) => [f.label, f]));

  const aAdvantages: FactorAdvantage[] = [];
  const bAdvantages: FactorAdvantage[] = [];

  for (const f of factorsA) {
    if (f.points <= 0) continue;
    const other = mapB.get(f.label);
    if (!other || other.points < f.points) {
      aAdvantages.push({
        label: f.label,
        points: f.points,
        explanation: other
          ? `${labelB} scores lower on this factor`
          : `${labelB} does not have this factor`,
      });
    }
  }

  for (const f of factorsB) {
    if (f.points <= 0) continue;
    const other = mapA.get(f.label);
    if (!other || other.points < f.points) {
      bAdvantages.push({
        label: f.label,
        points: f.points,
        explanation: other
          ? `${labelA} scores lower on this factor`
          : `${labelA} does not have this factor`,
      });
    }
  }

  return {
    aAdvantages: aAdvantages.slice(0, 5),
    bAdvantages: bAdvantages.slice(0, 5),
  };
}
