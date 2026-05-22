import {
  analyzeSet,
  findSet,
  type Analysis,
  type LegoSet,
  type Recommendation,
} from "@/lib/analyze";
import {
  calculateConfidence,
  setDataFromLegoSet,
  type ConfidenceResult,
} from "@/lib/confidence";

export type UrgencyTier = "imminent" | "soon" | "upcoming";

export const RETIRING_TIER_CONFIG: Record<
  UrgencyTier,
  {
    title: string;
    setNumbers: string[];
    monthsLabel: string;
    urgencyBarPercent: number;
    borderClass: string;
    barClass: string;
    badgeClass: string;
    timingAdvice: string;
  }
> = {
  imminent: {
    title: "Imminent — Under 3 Months",
    setNumbers: ["10297", "10312"],
    monthsLabel: "~2 months remaining",
    urgencyBarPercent: 92,
    borderClass: "border-l-red-500",
    barClass: "bg-red-500",
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
    timingAdvice:
      "🔴 Act Now — retirement expected within months. Buy sealed sets while still available at retail.",
  },
  soon: {
    title: "Soon — 3 to 6 Months",
    setNumbers: ["75192", "75308", "21332"],
    monthsLabel: "~4 months remaining",
    urgencyBarPercent: 65,
    borderClass: "border-l-[#f59e0b]",
    barClass: "bg-[#f59e0b]",
    badgeClass: "bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/30",
    timingAdvice:
      "🟡 Plan Your Move — start monitoring stock levels and secondary market prices.",
  },
  upcoming: {
    title: "Upcoming — 6 to 12 Months",
    setNumbers: ["21335", "10290", "42143", "10303", "75331"],
    monthsLabel: "~9 months remaining",
    urgencyBarPercent: 38,
    borderClass: "border-l-yellow-400",
    barClass: "bg-yellow-400",
    badgeClass: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
    timingAdvice:
      "🟢 Watch and Wait — monitor this set. Set a price alert on your watchlist.",
  },
};

export const TIER_ORDER: UrgencyTier[] = ["imminent", "soon", "upcoming"];

export function getTierForSetNumber(setNumber: string): UrgencyTier | null {
  const normalized = setNumber.trim();
  for (const tier of TIER_ORDER) {
    if (RETIRING_TIER_CONFIG[tier].setNumbers.includes(normalized)) {
      return tier;
    }
  }
  return null;
}

export function isUcsTheme(theme: string): boolean {
  return theme === "Star Wars UCS" || theme === "UCS Star Wars";
}

export function getHistoricalInsight(theme: string): string {
  if (theme === "Modular") {
    return "Retired Modulars have averaged 35–50% appreciation in year one";
  }
  if (isUcsTheme(theme)) {
    return "UCS sets typically see 25–45% gains in first 18 months post-retirement";
  }
  if (theme === "Creator Expert") {
    return "Creator Expert vehicles average 30–40% post-retirement gains";
  }
  return "Retired LEGO sets have historically averaged 25–40% appreciation";
}

export function getOpportunityLabel(score: number): string {
  if (score >= 80) return "Exceptional";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Good";
  return "Moderate";
}

export function calculateOpportunityScore(
  tier: UrgencyTier,
  set: LegoSet,
  estimatedValue: number,
  recommendation: Recommendation,
): number {
  let score = 0;
  if (tier === "imminent") score += 40;
  else if (tier === "soon") score += 25;
  else score += 15;

  if (isUcsTheme(set.theme)) score += 20;
  if (set.theme === "Modular") score += 20;
  if (estimatedValue > 300) score += 15;
  if (estimatedValue > 500) score += 10;
  if (set.pieces > 2000) score += 10;
  if (recommendation === "HOLD") score += 15;

  return Math.min(100, score);
}

export function getPostRetirementRange(estimatedValue: number): {
  low: number;
  high: number;
  maxUpsidePercent: number;
} {
  const low = Math.round(estimatedValue * 1.3);
  const high = Math.round(estimatedValue * 1.6);
  const maxUpsidePercent = Math.round((high / estimatedValue - 1) * 100);
  return { low, high, maxUpsidePercent };
}

export interface RetiringSoonEntry {
  set: LegoSet;
  analysis: Analysis;
  tier: UrgencyTier;
  tierConfig: (typeof RETIRING_TIER_CONFIG)[UrgencyTier];
  confidence: ConfidenceResult;
  opportunityScore: number;
  opportunityLabel: string;
  postRetirement: ReturnType<typeof getPostRetirementRange>;
  historicalInsight: string;
}

export function buildRetiringSoonEntry(setNumber: string): RetiringSoonEntry | null {
  const tier = getTierForSetNumber(setNumber);
  if (!tier) return null;

  const set = findSet(setNumber);
  if (!set || set.retired) return null;

  const analysis = analyzeSet(setNumber, "sealed");
  if (!analysis) return null;

  const tierConfig = RETIRING_TIER_CONFIG[tier];
  const opportunityScore = calculateOpportunityScore(
    tier,
    set,
    analysis.estimatedValue,
    analysis.recommendation,
  );

  return {
    set,
    analysis,
    tier,
    tierConfig,
    confidence: calculateConfidence(
      setDataFromLegoSet(
        set,
        analysis.recommendation,
        analysis.estimatedValue,
      ),
      "sealed",
    ),
    opportunityScore,
    opportunityLabel: getOpportunityLabel(opportunityScore),
    postRetirement: getPostRetirementRange(analysis.estimatedValue),
    historicalInsight: getHistoricalInsight(set.theme),
  };
}

export function getAllRetiringSoonEntries(): RetiringSoonEntry[] {
  const entries: RetiringSoonEntry[] = [];
  for (const tier of TIER_ORDER) {
    for (const setNumber of RETIRING_TIER_CONFIG[tier].setNumbers) {
      const entry = buildRetiringSoonEntry(setNumber);
      if (entry) entries.push(entry);
    }
  }
  return entries;
}

export function getRetiringSoonSummary(entries: RetiringSoonEntry[]) {
  const total = entries.length;
  const combinedValue = entries.reduce(
    (sum, e) => sum + e.analysis.estimatedValue,
    0,
  );
  const avgOpportunity =
    total > 0
      ? Math.round(
          entries.reduce((sum, e) => sum + e.opportunityScore, 0) / total,
        )
      : 0;
  const estimatedUplift = entries.reduce(
    (sum, e) => sum + e.analysis.estimatedValue * 0.4,
    0,
  );
  return { total, combinedValue, avgOpportunity, estimatedUplift };
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
