import type { Recommendation } from "@/lib/analyze";
import type { SetData } from "@/lib/confidence";

export type OpportunityType =
  | "Pre-Retirement Window"
  | "Recently Retired"
  | "Vintage Undervalued"
  | "Theme Momentum"
  | "Flagship Collector"
  | "Seasonal Demand"
  | "IP Scarcity"
  | "Low Supply High Demand";

export type OpportunityLabel =
  | "Exceptional"
  | "Strong"
  | "Good"
  | "Moderate"
  | "Low";

export type BuySignal = "Strong Buy" | "Buy" | "Watch" | "Avoid";

export interface OpportunitySetData extends SetData {
  year?: number;
}

export interface OpportunityScoreResult {
  opportunityScore: number;
  opportunityLabel: OpportunityLabel;
  opportunityType: OpportunityType[];
  buySignal: BuySignal;
  projectedValue12m: number;
  projectedValue24m: number;
  projectedROI12m: number;
  projectedROI24m: number;
  reasoning: string[];
}

function isUcsTheme(theme: string): boolean {
  return theme === "Star Wars UCS" || theme === "UCS Star Wars";
}

function isRetired(set: OpportunitySetData): boolean {
  return set.retired === true;
}

function isRetiringSoon(set: OpportunitySetData): boolean {
  return set.retiringSoon === true && set.retired !== true;
}

function isActive(set: OpportunitySetData): boolean {
  return !isRetired(set) && !isRetiringSoon(set);
}

function clampScore(raw: number): number {
  return Math.min(100, Math.max(0, raw));
}

export function getOpportunityLabel(score: number): OpportunityLabel {
  if (score >= 80) return "Exceptional";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Good";
  if (score >= 20) return "Moderate";
  return "Low";
}

export function getBuySignal(score: number): BuySignal {
  if (score >= 80) return "Strong Buy";
  if (score >= 60) return "Buy";
  if (score >= 40) return "Watch";
  return "Avoid";
}

function getProjectionMultipliers(set: OpportunitySetData): {
  m12: number;
  m24: number;
} {
  const year = set.year ?? 2020;
  if (isRetiringSoon(set)) return { m12: 1.4, m24: 1.7 };
  if (isRetired(set) && year >= 2020) return { m12: 1.25, m24: 1.45 };
  if (isRetired(set) && year < 2015) return { m12: 1.15, m24: 1.3 };
  if (isActive(set)) return { m12: 1.05, m24: 1.35 };
  return { m12: 1.25, m24: 1.45 };
}

function buildReasoning(
  set: OpportunitySetData,
  types: OpportunityType[],
): string[] {
  const pool: string[] = [];

  if (types.includes("Pre-Retirement Window")) {
    pool.push(
      "Retiring soon sets have historically appreciated 30–50% in year one post-retirement",
    );
  }
  if (types.includes("Flagship Collector") || isUcsTheme(set.theme)) {
    pool.push(
      "UCS sets maintain demand due to the enduring strength of the Star Wars IP",
    );
  }
  if (types.includes("Theme Momentum") && set.theme === "Modular") {
    pool.push(
      "Modular buildings have the most consistent appreciation record in LEGO resale",
    );
  }
  if (types.includes("Vintage Undervalued")) {
    pool.push(
      "Vintage status (pre-2015) means sealed examples are increasingly scarce",
    );
  }
  if (types.includes("Recently Retired")) {
    pool.push(
      "Recently retired sets are in the early appreciation phase — typically 1–3 years of growth",
    );
  }
  if (types.includes("Low Supply High Demand")) {
    pool.push(
      "Mid-era retired sets (2015–2019) are exiting retail supply with rising collector demand",
    );
  }
  if (types.includes("IP Scarcity")) {
    pool.push(
      "Licensed Ideas sets face IP constraints that limit reissues and tighten supply",
    );
  }
  if (set.pieces > 2000) {
    pool.push(
      "Large piece counts (2000+) attract serious collectors and command display premiums",
    );
  }
  if (set.recommendation === "HOLD" && isRetiringSoon(set)) {
    pool.push(
      "HOLD signal aligns with holding through retirement for maximum appreciation upside",
    );
  }

  const unique = [...new Set(pool)];
  return unique.slice(0, 4);
}

export function scoreOpportunity(set: OpportunitySetData): OpportunityScoreResult {
  const year = set.year ?? 2020;
  let score = 0;
  const types: OpportunityType[] = [];

  if (isRetiringSoon(set)) {
    score += 35;
    types.push("Pre-Retirement Window");
  }

  if (isRetired(set) && year >= 2020) {
    score += 30;
    types.push("Recently Retired");
  } else if (isRetired(set) && year < 2015) {
    score += 25;
    types.push("Vintage Undervalued");
  } else if (isRetired(set) && year >= 2015 && year <= 2019) {
    score += 20;
    types.push("Low Supply High Demand");
  }

  if (isUcsTheme(set.theme)) {
    score += 20;
    if (!types.includes("Flagship Collector")) {
      types.push("Flagship Collector");
    }
  }

  if (set.theme === "Modular") {
    score += 20;
    if (!types.includes("Theme Momentum")) {
      types.push("Theme Momentum");
    }
  }

  if (set.theme.includes("Ideas") && isRetired(set)) {
    score += 15;
    types.push("IP Scarcity");
  }

  if (set.theme === "Creator Expert" && isRetired(set)) {
    score += 15;
    if (!types.includes("Theme Momentum")) {
      types.push("Theme Momentum");
    }
  }

  if (set.pieces > 4000) score += 10;
  else if (set.pieces > 2000) score += 5;

  if (set.estimatedValue > 300) score += 10;

  if (set.recommendation === "HOLD") score += 10;
  if (set.recommendation === "SELL" && isRetired(set)) score += 5;

  if (isActive(set)) score -= 20;
  if (set.estimatedValue < 80) score -= 15;

  const opportunityScore = clampScore(score);
  const { m12, m24 } = getProjectionMultipliers(set);
  const projectedValue12m = Math.round(set.estimatedValue * m12);
  const projectedValue24m = Math.round(set.estimatedValue * m24);
  const projectedROI12m =
    set.estimatedValue > 0
      ? Math.round(
          ((projectedValue12m - set.estimatedValue) / set.estimatedValue) *
            100,
        )
      : 0;
  const projectedROI24m =
    set.estimatedValue > 0
      ? Math.round(
          ((projectedValue24m - set.estimatedValue) / set.estimatedValue) *
            100,
        )
      : 0;

  return {
    opportunityScore,
    opportunityLabel: getOpportunityLabel(opportunityScore),
    opportunityType: types,
    buySignal: getBuySignal(opportunityScore),
    projectedValue12m,
    projectedValue24m,
    projectedROI12m,
    projectedROI24m,
    reasoning: buildReasoning(set, types),
  };
}

export function opportunitySetFromLego(
  set: {
    theme: string;
    pieces: number;
    year?: number;
    retired?: boolean;
    retiringSoon?: boolean;
  },
  recommendation: Recommendation,
  estimatedValue: number,
): OpportunitySetData {
  return {
    theme: set.theme,
    pieces: set.pieces,
    year: set.year,
    retired: set.retired,
    retiringSoon: set.retiringSoon,
    recommendation,
    estimatedValue,
  };
}

export function buySignalClassName(signal: BuySignal): string {
  switch (signal) {
    case "Strong Buy":
      return "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30";
    case "Buy":
      return "bg-green-500/20 text-green-400 ring-1 ring-green-500/30";
    case "Watch":
      return "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30";
    default:
      return "bg-red-500/20 text-red-400 ring-1 ring-red-500/30";
  }
}

export type OpportunityTier = "exceptional" | "strong" | "watch" | "low";

export function getOpportunityTier(score: number): OpportunityTier {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "strong";
  if (score >= 40) return "watch";
  return "low";
}

export function tierSectionClass(tier: OpportunityTier): string {
  switch (tier) {
    case "exceptional":
      return "border-l-4 border-red-500 bg-red-500/5";
    case "strong":
      return "border-l-4 border-amber-500 bg-amber-500/5";
    case "watch":
      return "border-l-4 border-yellow-500 bg-yellow-500/5";
    default:
      return "border-l-4 border-white/10 bg-white/[0.02]";
  }
}
