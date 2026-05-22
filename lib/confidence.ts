import type { Condition, Recommendation } from "@/lib/analyze";
import { isSetRetired, isSetRetiringSoon } from "@/lib/analyze";

export interface SetData {
  theme: string;
  pieces: number;
  retired?: boolean;
  retiringSoon?: boolean;
  recommendation: Recommendation;
  estimatedValue: number;
}

export interface ConfidenceFactor {
  label: string;
  explanation: string;
  points: number;
  positive: boolean;
}

export interface ConfidenceResult {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  factors: ConfidenceFactor[];
}

function clampScore(raw: number): number {
  return Math.min(100, Math.max(5, raw));
}

function isUcsTheme(theme: string): boolean {
  return theme === "Star Wars UCS" || theme === "UCS Star Wars";
}

export function getConfidenceStyling(score: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (score >= 80) {
    return {
      label: "Very High Confidence",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    };
  }
  if (score >= 65) {
    return {
      label: "High Confidence",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    };
  }
  if (score >= 50) {
    return {
      label: "Medium Confidence",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    };
  }
  if (score >= 35) {
    return {
      label: "Low Confidence",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    };
  }
  return {
    label: "Very Low Confidence",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  };
}

export type ConfidenceBand = "high" | "medium" | "low";

export function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= 65) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function getConfidenceBandLabel(band: ConfidenceBand): string {
  switch (band) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

export function calculateConfidence(
  set: SetData,
  condition: string,
): ConfidenceResult {
  const factors: ConfidenceFactor[] = [];
  let raw = 0;

  const normalizedCondition = condition as Condition;
  const isRetired = set.retired === true;
  const isRetiringSoon =
    set.retiringSoon === true && set.retired !== true;
  const isActive = !isRetired && !isRetiringSoon;

  if (isRetired) {
    factors.push({
      label: "Production Discontinued",
      explanation:
        "No longer manufactured. As existing stock sells through globally, scarcity compounds and prices typically rise. This is the single strongest value driver in the LEGO secondary market.",
      points: 30,
      positive: true,
    });
    raw += 30;
  }

  if (isRetiringSoon) {
    factors.push({
      label: "Pre-Retirement Window",
      explanation:
        "Expected to retire within 6–12 months. Historically the 3–6 months before retirement and 12 months after represent the strongest appreciation window for LEGO sets.",
      points: 20,
      positive: true,
    });
    raw += 20;
  }

  if (set.recommendation === "SELL" && isRetired) {
    factors.push({
      label: "Strong Exit Signal",
      explanation:
        "Retired status plus active buyer demand supports listing at a premium. Current secondary market conditions favour sellers in this category.",
      points: 20,
      positive: true,
    });
    raw += 20;
  }

  if (set.recommendation === "HOLD" && isRetiringSoon) {
    factors.push({
      label: "Pre-Retirement Hold",
      explanation:
        "Approaching retirement — holding through the cutoff typically captures stronger appreciation than selling before production ends.",
      points: 20,
      positive: true,
    });
    raw += 20;
  }

  if (isUcsTheme(set.theme)) {
    factors.push({
      label: "Ultimate Collector Series",
      explanation:
        "UCS sets are the most actively traded category in LEGO resale. Designed for adult display, they attract Star Wars fans, LEGO collectors and investors simultaneously. Long-term demand is structural, not speculative.",
      points: 15,
      positive: true,
    });
    raw += 15;
  }

  if (set.theme === "Modular") {
    factors.push({
      label: "Modular Buildings",
      explanation:
        "The most consistent appreciation track record of any LEGO theme. Early Modulars (2007–2012) have appreciated 400–600% from retail. City builders actively seek retired examples to complete displays.",
      points: 15,
      positive: true,
    });
    raw += 15;
  }

  if (set.theme.includes("Ideas")) {
    factors.push({
      label: "LEGO Ideas",
      explanation:
        "Fan-voted sets carry emotional weight that sustains collector demand. Licensed Ideas sets are particularly valuable as IP agreements often prevent reissues, creating permanent scarcity.",
      points: 10,
      positive: true,
    });
    raw += 10;
  }

  if (set.theme === "Creator Expert") {
    factors.push({
      label: "Creator Expert Demand",
      explanation:
        "Strong appeal to adult collectors and licensed-brand enthusiasts. Vehicle and display sets often attract buyers beyond core LEGO collectors.",
      points: 10,
      positive: true,
    });
    raw += 10;
  }

  if (set.pieces > 4000) {
    factors.push({
      label: "Flagship Set Size",
      explanation:
        "Sets over 4,000 pieces command display premiums and attract serious collectors willing to pay for flagship builds.",
      points: 10,
      positive: true,
    });
    raw += 10;
  }

  if (set.pieces > 2000) {
    factors.push({
      label: "Large Set Premium",
      explanation:
        "Large piece counts support stronger resale positioning versus mid-size sets in the same theme.",
      points: 5,
      positive: true,
    });
    raw += 5;
  }

  if (normalizedCondition === "sealed") {
    factors.push({
      label: "Factory Sealed",
      explanation:
        "Sealed sets command a 25–40% premium over complete used in most categories. Serious collectors and investors prefer sealed examples. This condition tier accesses a separate and more valuable buyer pool.",
      points: 10,
      positive: true,
    });
    raw += 10;
  }

  if (set.estimatedValue > 500) {
    factors.push({
      label: "Premium Value Tier",
      explanation:
        "Sets in the $500+ range attract serious collectors and investors rather than casual buyers. This tier has a smaller but more motivated buyer pool and historically holds value exceptionally well.",
      points: 10,
      positive: true,
    });
    raw += 10;
  }

  if (set.estimatedValue > 200) {
    factors.push({
      label: "Mid-High Value",
      explanation:
        "Mid-to-high estimated value supports a broader motivated buyer pool than entry-level sets.",
      points: 5,
      positive: true,
    });
    raw += 5;
  }

  if (normalizedCondition === "incomplete") {
    factors.push({
      label: "Incomplete Condition",
      explanation:
        "Missing pieces reduce both value and buyer pool significantly. Expect 40–60% discount vs complete used. Many collectors will not purchase incomplete sets regardless of price.",
      points: -20,
      positive: false,
    });
    raw -= 20;
  }

  if (normalizedCondition === "complete") {
    factors.push({
      label: "Used Condition Discount",
      explanation:
        "Complete used sets trade below sealed tiers — typically 20–30% less — but remain viable for buyers who prioritise build value over packaging.",
      points: -5,
      positive: false,
    });
    raw -= 5;
  }

  if (isActive && set.recommendation === "SELL") {
    factors.push({
      label: "Pre-Retirement Sale Risk",
      explanation:
        "Selling before retirement typically means leaving 20–50% upside unrealised. The retirement event is the primary value catalyst for most LEGO sets. Consider whether immediate liquidity justifies this opportunity cost.",
      points: -15,
      positive: false,
    });
    raw -= 15;
  }

  if (set.estimatedValue < 100) {
    factors.push({
      label: "Limited Margin",
      explanation:
        "Below $100 estimated value leaves minimal profit after platform fees (eBay ~13%, Facebook time cost). Assess whether the effort of listing is justified at this price point.",
      points: -10,
      positive: false,
    });
    raw -= 10;
  }

  const score = clampScore(raw);
  const styling = getConfidenceStyling(score);

  return {
    score,
    label: styling.label,
    color: styling.color,
    bgColor: styling.bgColor,
    borderColor: styling.borderColor,
    factors,
  };
}

export function setDataFromLegoSet(
  set: {
    theme: string;
    pieces: number;
    retired?: boolean;
    retiringSoon?: boolean;
  },
  recommendation: Recommendation,
  estimatedValue: number,
): SetData {
  return {
    theme: set.theme,
    pieces: set.pieces,
    retired: set.retired,
    retiringSoon: set.retiringSoon,
    recommendation,
    estimatedValue,
  };
}
