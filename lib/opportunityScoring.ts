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
  | "Low Supply High Demand"
  | "Market Above Estimate";

export type OpportunityLabel =
  | "Exceptional"
  | "Strong"
  | "Good"
  | "Moderate"
  | "Low";

export type BuySignal = "Strong Buy" | "Buy" | "Watch" | "Avoid";

export interface OpportunitySetData extends SetData {
  year?: number;
  setNumber?: string;
  /** Live eBay Browse API average (AUD), when available */
  ebayAvgListedPriceAud?: number | null;
}

export interface OpportunityFactor {
  label: string;
  explanation: string;
  points: number;
  positive: boolean;
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
  factors: OpportunityFactor[];
}

function addOpportunityFactor(
  factors: OpportunityFactor[],
  label: string,
  explanation: string,
  points: number,
) {
  factors.push({
    label,
    explanation,
    points,
    positive: points >= 0,
  });
}

function normalizeTheme(theme: string): string {
  return theme.trim().toLowerCase();
}

function isUcsTheme(theme: string): boolean {
  const t = normalizeTheme(theme);
  return t === "star wars ucs" || t === "ucs star wars";
}

function isModularTheme(theme: string): boolean {
  return normalizeTheme(theme) === "modular";
}

function isCreatorExpertTheme(theme: string): boolean {
  return normalizeTheme(theme) === "creator expert";
}

function isIdeasTheme(theme: string): boolean {
  return normalizeTheme(theme).includes("ideas");
}

/** Premium retired themes get a higher opportunity score floor (50). */
function isPremiumRetiredTheme(theme: string): boolean {
  return (
    isUcsTheme(theme) ||
    isModularTheme(theme) ||
    isCreatorExpertTheme(theme) ||
    isIdeasTheme(theme)
  );
}

/**
 * Uses catalogue `retired` when set; infers retirement for older sets missing the flag.
 */
export function isRetired(set: OpportunitySetData): boolean {
  if (set.retired === true) return true;
  if (set.retiringSoon === true) return false;
  if (set.retired === false) return false;
  const year = set.year ?? 2020;
  return year <= 2019;
}

function isRetiringSoon(set: OpportunitySetData): boolean {
  return set.retiringSoon === true && !isRetired(set);
}

function isActive(set: OpportunitySetData): boolean {
  return !isRetired(set) && !isRetiringSoon(set);
}

function clampScore(raw: number): number {
  return Math.min(100, Math.max(0, raw));
}

function applyOpportunityScoreFloors(
  set: OpportunitySetData,
  score: number,
): number {
  let floor = 0;

  if (set.retiringSoon === true) {
    floor = Math.max(floor, 45);
  }

  if (set.retired === true) {
    floor = Math.max(
      floor,
      isPremiumRetiredTheme(set.theme) ? 50 : 35,
    );
  } else if (isRetired(set) && set.retired !== false) {
    floor = Math.max(
      floor,
      isPremiumRetiredTheme(set.theme) ? 50 : 35,
    );
  }

  return floor > 0 ? Math.max(score, floor) : score;
}

export function getOpportunityLabel(score: number): OpportunityLabel {
  if (score >= 80) return "Exceptional";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Good";
  if (score >= 20) return "Moderate";
  return "Low";
}

export function getBuySignal(
  score: number,
  options?: { retired?: boolean },
): BuySignal {
  if (options?.retired) {
    if (score >= 80) return "Strong Buy";
    if (score >= 60) return "Buy";
    return "Watch";
  }
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

  if (types.includes("Market Above Estimate")) {
    pool.push(
      "Market prices above estimate — live eBay listings suggest higher real market value",
    );
  }
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
  if (types.includes("Theme Momentum") && isModularTheme(set.theme)) {
    pool.push(
      "Modular buildings have the most consistent appreciation record in LEGO resale",
    );
  }
  if (types.includes("Theme Momentum") && isCreatorExpertTheme(set.theme)) {
    pool.push(
      "Creator Expert retired sets attract car and display collectors with steady resale demand",
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

function logOpportunityDebug(
  set: OpportunitySetData,
  breakdown: Record<string, number | string | boolean>,
  finalScore: number,
): void {
  if (typeof process === "undefined" || process.env.NODE_ENV !== "development") {
    return;
  }
  if (finalScore > 0 && !set.setNumber) return;
  console.log("[opportunityScoring]", set.setNumber ?? "unknown", {
    theme: set.theme,
    year: set.year,
    retiredFlag: set.retired,
    inferredRetired: isRetired(set),
    estimatedValue: set.estimatedValue,
    ebayAvgListedPriceAud: set.ebayAvgListedPriceAud,
    recommendation: set.recommendation,
    ...breakdown,
    finalScore,
  });
}

/** Score buying/holding opportunity for a set (0–100). */
export function scoreOpportunity(set: OpportunitySetData): OpportunityScoreResult {
  const year = set.year ?? 2020;
  let score = 0;
  const types: OpportunityType[] = [];
  const breakdown: Record<string, number> = {};
  const factors: OpportunityFactor[] = [];

  if (isRetiringSoon(set)) {
    score += 35;
    breakdown.retiringSoon = 35;
    types.push("Pre-Retirement Window");
    addOpportunityFactor(
      factors,
      "Pre-Retirement Window",
      "Expected to retire within 6–12 months — historically the strongest buy/hold window before supply tightens.",
      35,
    );
  }

  if (isRetired(set)) {
    if (year >= 2020) {
      score += 30;
      breakdown.retiredRecent = 30;
      types.push("Recently Retired");
      addOpportunityFactor(
        factors,
        "Recently Retired",
        "Early post-retirement phase when appreciation often accelerates in the first 1–3 years.",
        30,
      );
    } else if (year < 2015) {
      score += 25;
      breakdown.retiredVintage = 25;
      types.push("Vintage Undervalued");
      addOpportunityFactor(
        factors,
        "Vintage Undervalued",
        "Pre-2015 retirement — sealed supply is structurally scarce with long-run collector demand.",
        25,
      );
    } else if (year >= 2015 && year <= 2019) {
      score += 20;
      breakdown.retiredMidEra = 20;
      types.push("Low Supply High Demand");
      addOpportunityFactor(
        factors,
        "Mid-Era Retired",
        "2015–2019 retired sets are exiting retail channels with tightening supply.",
        20,
      );
    }
  }

  if (isUcsTheme(set.theme)) {
    score += 20;
    breakdown.ucsTheme = 20;
    if (!types.includes("Flagship Collector")) {
      types.push("Flagship Collector");
    }
    addOpportunityFactor(
      factors,
      "UCS Theme",
      "Ultimate Collector Series — highest demand category in LEGO resale with global buyer depth.",
      20,
    );
  }

  if (isModularTheme(set.theme)) {
    score += 20;
    breakdown.modularTheme = 20;
    if (!types.includes("Theme Momentum")) {
      types.push("Theme Momentum");
    }
    addOpportunityFactor(
      factors,
      "Modular Buildings",
      "Modular theme has the most consistent long-term appreciation track record.",
      20,
    );
  }

  if (isIdeasTheme(set.theme) && isRetired(set)) {
    score += 15;
    breakdown.ideasRetired = 15;
    types.push("IP Scarcity");
    addOpportunityFactor(
      factors,
      "Ideas IP Scarcity",
      "Licensed Ideas sets often cannot be reissued — permanent scarcity after retirement.",
      15,
    );
  }

  if (isCreatorExpertTheme(set.theme) && isRetired(set)) {
    score += 15;
    breakdown.creatorExpertRetired = 15;
    if (!types.includes("Theme Momentum")) {
      types.push("Theme Momentum");
    }
    addOpportunityFactor(
      factors,
      "Creator Expert Retired",
      "Display and vehicle collectors sustain demand for retired Creator Expert sets.",
      15,
    );
  }

  if (set.pieces > 4000) {
    score += 10;
    breakdown.pieces4000 = 10;
    addOpportunityFactor(
      factors,
      "Flagship Piece Count",
      "4,000+ pieces attract serious collectors willing to pay display premiums.",
      10,
    );
  } else if (set.pieces > 2000) {
    score += 5;
    breakdown.pieces2000 = 5;
    addOpportunityFactor(
      factors,
      "Large Piece Count",
      "2,000+ piece sets command stronger positioning than mid-size alternatives.",
      5,
    );
  } else if (set.pieces > 1000) {
    score += 5;
    breakdown.pieces1000 = 5;
    addOpportunityFactor(
      factors,
      "Substantial Build",
      "1,000+ pieces supports stronger collector interest versus small sets.",
      5,
    );
  }

  if (set.estimatedValue > 300) {
    score += 10;
    breakdown.value300 = 10;
    addOpportunityFactor(
      factors,
      "High Value Asset",
      "Premium price tier attracts motivated collectors and investors.",
      10,
    );
  } else if (set.estimatedValue > 200) {
    score += 5;
    breakdown.value200 = 5;
    addOpportunityFactor(
      factors,
      "Mid-High Value",
      "Solid estimated value supports a healthy buyer pool.",
      5,
    );
  }

  if (set.recommendation === "HOLD") {
    score += 10;
    breakdown.holdRec = 10;
    addOpportunityFactor(
      factors,
      "HOLD Signal",
      "Catalogue recommends holding — aligns with appreciation-focused strategy.",
      10,
    );
  }
  if (set.recommendation === "SELL" && isRetired(set)) {
    score += 5;
    breakdown.sellRetired = 5;
    addOpportunityFactor(
      factors,
      "Retired SELL Window",
      "Retired plus SELL signal — strong near-term exit liquidity opportunity.",
      5,
    );
  }

  const ebayAvg = set.ebayAvgListedPriceAud;
  if (
    ebayAvg != null &&
    ebayAvg > 0 &&
    ebayAvg > set.estimatedValue * 1.2
  ) {
    score += 15;
    breakdown.ebayAboveEstimate = 15;
    types.push("Market Above Estimate");
    addOpportunityFactor(
      factors,
      "eBay Above Estimate",
      "Live eBay listings average above our estimate — market may be hotter than catalogue pricing.",
      15,
    );
  }

  if (isActive(set) && set.retired !== true) {
    score -= 20;
    breakdown.activePenalty = -20;
    addOpportunityFactor(
      factors,
      "Active Set",
      "Still in production — retail availability limits secondary market upside.",
      -20,
    );
  }
  if (set.estimatedValue < 80) {
    score -= 15;
    breakdown.lowValuePenalty = -15;
    addOpportunityFactor(
      factors,
      "Low Value Tier",
      "Under $80 estimated value — limited upside after fees and effort.",
      -15,
    );
  }

  const rawScore = clampScore(score);
  const retired = set.retired === true || isRetired(set);
  const opportunityScore = applyOpportunityScoreFloors(set, rawScore);

  logOpportunityDebug(
    set,
    {
      ...breakdown,
      catalogRetired: set.retired === true,
      retiringSoonFlag: set.retiringSoon === true,
      premiumTheme: isPremiumRetiredTheme(set.theme),
    },
    opportunityScore,
  );

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
    buySignal: getBuySignal(opportunityScore, { retired }),
    projectedValue12m,
    projectedValue24m,
    projectedROI12m,
    projectedROI24m,
    reasoning: buildReasoning(set, types),
    factors,
  };
}

/** @deprecated Use scoreOpportunity */
export const calculateOpportunity = scoreOpportunity;

export function opportunitySetFromLego(
  set: {
    number?: string;
    theme: string;
    pieces: number;
    year?: number;
    retired?: boolean;
    retiringSoon?: boolean;
  },
  recommendation: Recommendation,
  estimatedValue: number,
  options?: { ebayAvgListedPriceAud?: number | null },
): OpportunitySetData {
  return {
    setNumber: set.number,
    theme: set.theme,
    pieces: set.pieces,
    year: set.year,
    retired: set.retired,
    retiringSoon: set.retiringSoon,
    recommendation,
    estimatedValue,
    ebayAvgListedPriceAud: options?.ebayAvgListedPriceAud,
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
