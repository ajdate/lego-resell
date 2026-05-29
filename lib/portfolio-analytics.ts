import {
  analyzeSet,
  findSet,
  isSetRetired,
  isSetRetiringSoon,
  type PortfolioCondition,
} from "@/lib/analyze";
import { computeDiversificationInsights, getConcentrationLevel } from "@/lib/diversification";
import {
  detectGrowthMilestones,
  getGrowthSnapshots,
  getGrowthSummary,
  getMonthlyBreakdown,
  type GrowthMilestone,
  type GrowthSnapshot,
} from "@/lib/growthTracking";
import {
  opportunitySetFromLego,
  scoreOpportunity,
  type OpportunityLabel,
  type OpportunityScoreResult,
} from "@/lib/opportunityScoring";
import {
  computePortfolioMetrics,
  itemPercentGain,
  syncItemTotals,
  type PortfolioItem,
} from "@/lib/portfolio";

export type RiskLabel =
  | "Low Risk"
  | "Medium Risk"
  | "High Risk"
  | "Very High Risk";

export type PortfolioSetOpportunity = {
  setNumber: string;
  name: string;
  theme: string;
  condition: PortfolioCondition;
  recommendation: "SELL" | "HOLD";
  estimatedValue: number;
  suggestedListPrice: number;
  totalEstimatedValue: number;
  totalListPrice: number;
  profitOpportunity: number;
  quantity: number;
  opportunity: OpportunityScoreResult;
  retired: boolean;
  active: boolean;
  retiringSoon: boolean;
};

export type ThemePerformanceRow = {
  theme: string;
  setCount: number;
  totalValue: number;
  avgRoiPercent: number;
  sellCount: number;
  holdCount: number;
  risk: string;
};

export type PortfolioAnalytics = {
  metrics: ReturnType<typeof computePortfolioMetrics>;
  growthSummary: ReturnType<typeof getGrowthSummary> | null;
  snapshots: GrowthSnapshot[];
  milestones: GrowthMilestone[];
  monthlyRows: ReturnType<typeof getMonthlyBreakdown>;
  lastUpdated: string;
  healthScore100: number;
  potentialUpside: number;
  potentialUpsidePercent: number;
  sellValue: number;
  holdValue: number;
  mixedSetCount: number;
  sellPriority: PortfolioSetOpportunity[];
  riskScore: number;
  riskLabel: RiskLabel;
  riskFactors: { positive: boolean; text: string }[];
  avgOpportunityScore: number;
  opportunityBreakdown: Record<OpportunityLabel, number>;
  topOpportunities: PortfolioSetOpportunity[];
  retiringSoonSets: PortfolioSetOpportunity[];
  retiringSoonCount: number;
  retiringSoonValue: number;
  retiringSoonUpsideLow: number;
  retiringSoonUpsideHigh: number;
  themeRows: ThemePerformanceRow[];
  bestTheme: ThemePerformanceRow | null;
  worstTheme: ThemePerformanceRow | null;
  composition: {
    retired: number;
    active: number;
    retiringSoon: number;
    sealed: number;
    complete: number;
    incomplete: number;
    sell: number;
    hold: number;
    totalCopies: number;
    totalSets: number;
  };
  collectionInsights: string[];
  smartRecommendations: {
    actionNow: string;
    holdStrategy: string;
    diversification: string;
  };
  diversification: ReturnType<typeof computeDiversificationInsights>;
  enrichedSets: PortfolioSetOpportunity[];
};

function riskLabelFromScore(score: number): RiskLabel {
  if (score <= 25) return "Low Risk";
  if (score <= 50) return "Medium Risk";
  if (score <= 75) return "High Risk";
  return "Very High Risk";
}

function riskColorClass(label: RiskLabel): string {
  switch (label) {
    case "Low Risk":
      return "text-emerald-400";
    case "Medium Risk":
      return "text-amber-400";
    case "High Risk":
      return "text-orange-400";
    case "Very High Risk":
      return "text-red-400";
  }
}

export { riskColorClass };

function enrichPortfolioItem(item: PortfolioItem): PortfolioSetOpportunity | null {
  const synced = syncItemTotals(item);
  const analysis = analyzeSet(synced.setNumber, synced.condition);
  const catalog = findSet(synced.setNumber);
  if (!analysis) return null;

  const opportunity = scoreOpportunity(
    opportunitySetFromLego(
      analysis.set,
      analysis.recommendation,
      analysis.estimatedValue,
    ),
  );

  const totalEstimatedValue = synced.totalEstimatedValue;
  const totalListPrice = synced.suggestedListPrice * synced.quantity;
  const profitOpportunity = Math.max(0, totalListPrice - totalEstimatedValue);

  return {
    setNumber: synced.setNumber,
    name: synced.name,
    theme: synced.theme,
    condition: synced.condition,
    recommendation: synced.recommendation,
    estimatedValue: synced.estimatedValue,
    suggestedListPrice: synced.suggestedListPrice,
    totalEstimatedValue,
    totalListPrice,
    profitOpportunity,
    quantity: synced.quantity,
    opportunity,
    retired: catalog ? isSetRetired(catalog) : false,
    active: catalog ? !isSetRetired(catalog) && !isSetRetiringSoon(catalog) : false,
    retiringSoon: catalog ? isSetRetiringSoon(catalog) : false,
  };
}

function computeRiskScore(
  items: PortfolioItem[],
  sets: PortfolioSetOpportunity[],
  topThemePercent: number,
): { score: number; label: RiskLabel; factors: { positive: boolean; text: string }[] } {
  let score = 50;
  const factors: { positive: boolean; text: string }[] = [];

  const retiredCount = sets.filter((s) => s.retired).length;
  const activeCount = sets.filter((s) => s.active).length;
  const incompleteCopies = items.reduce((sum, item) => {
    for (const copy of item.copies) {
      if (copy.condition === "incomplete" || copy.condition === "damaged-box") {
        sum += 1;
      }
    }
    return sum;
  }, 0);
  const highValueSets = sets.filter((s) => s.totalEstimatedValue > 500).length;
  const liquidSets = sets.filter((s) => s.totalEstimatedValue < 200).length;

  if (retiredCount > 0) {
    score -= retiredCount * 3;
    factors.push({
      positive: true,
      text: `${retiredCount} retired set${retiredCount === 1 ? "" : "s"} reduce portfolio risk`,
    });
  }
  if (activeCount > 0) {
    score += activeCount * 3;
    factors.push({
      positive: false,
      text: `${activeCount} active set${activeCount === 1 ? "" : "s"} increase market exposure`,
    });
  }
  if (incompleteCopies > 0) {
    score += incompleteCopies * 5;
    factors.push({
      positive: false,
      text: `${incompleteCopies} incomplete cop${incompleteCopies === 1 ? "y" : "ies"} increase risk`,
    });
  }
  if (highValueSets > 0) {
    score += highValueSets * 4;
    factors.push({
      positive: false,
      text: `${highValueSets} set${highValueSets === 1 ? "" : "s"} over $500 add liquidity risk`,
    });
  }
  if (liquidSets > 0) {
    score -= liquidSets * 2;
    factors.push({
      positive: true,
      text: `${liquidSets} set${liquidSets === 1 ? "" : "s"} under $200 provide liquidity`,
    });
  }
  if (topThemePercent > 50) {
    score += 10;
    const topTheme = sets.reduce<Map<string, number>>((map, s) => {
      map.set(s.theme, (map.get(s.theme) ?? 0) + s.totalEstimatedValue);
      return map;
    }, new Map());
    const dominant = [...topTheme.entries()].sort((a, b) => b[1] - a[1])[0];
    factors.push({
      positive: false,
      text: `${dominant?.[0] ?? "One theme"} at ${Math.round(topThemePercent)}% — concentration risk`,
    });
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clamped, label: riskLabelFromScore(clamped), factors: factors.slice(0, 6) };
}

function buildThemeRows(
  items: PortfolioItem[],
  sets: PortfolioSetOpportunity[],
): ThemePerformanceRow[] {
  const itemByNumber = new Map(items.map((item) => [item.setNumber, item]));
  const map = new Map<string, { sets: PortfolioSetOpportunity[]; totalValue: number }>();
  const portfolioTotal = sets.reduce((sum, s) => sum + s.totalEstimatedValue, 0);

  for (const set of sets) {
    const row = map.get(set.theme) ?? { sets: [], totalValue: 0 };
    row.sets.push(set);
    row.totalValue += set.totalEstimatedValue;
    map.set(set.theme, row);
  }

  return [...map.entries()]
    .map(([theme, data]) => {
      const sellCount = data.sets.filter((s) => s.recommendation === "SELL").length;
      const holdCount = data.sets.filter((s) => s.recommendation === "HOLD").length;
      const roiValues = data.sets
        .map((s) => itemByNumber.get(s.setNumber))
        .filter((item): item is PortfolioItem => Boolean(item))
        .map((item) => itemPercentGain(syncItemTotals(item)));
      const avgRoiPercent =
        roiValues.length > 0
          ? Math.round(roiValues.reduce((sum, v) => sum + v, 0) / roiValues.length)
          : 0;
      const percent = portfolioTotal > 0 ? (data.totalValue / portfolioTotal) * 100 : 0;
      return {
        theme,
        setCount: data.sets.length,
        totalValue: data.totalValue,
        avgRoiPercent,
        sellCount,
        holdCount,
        risk: getConcentrationLevel(percent).includes("High")
          ? "High"
          : getConcentrationLevel(percent).includes("Moderate")
            ? "Medium"
            : "Low",
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);
}

export function buildPortfolioAnalytics(items: PortfolioItem[]): PortfolioAnalytics | null {
  if (items.length === 0) return null;

  const synced = items.map(syncItemTotals);
  const metrics = computePortfolioMetrics(synced);
  const enrichedSets = synced
    .map(enrichPortfolioItem)
    .filter((s): s is PortfolioSetOpportunity => s !== null);

  if (enrichedSets.length === 0) return null;

  const snapshots = getGrowthSnapshots();
  const growthSummary = snapshots.length >= 2 ? getGrowthSummary(snapshots) : null;
  const milestones = detectGrowthMilestones(snapshots);
  const monthlyRows = getMonthlyBreakdown(snapshots);
  const diversification = computeDiversificationInsights(synced);

  const sellSets = enrichedSets.filter((s) => s.recommendation === "SELL");
  const holdSets = enrichedSets.filter((s) => s.recommendation === "HOLD");
  const sellValue = sellSets.reduce((sum, s) => sum + s.totalEstimatedValue, 0);
  const holdValue = holdSets.reduce((sum, s) => sum + s.totalEstimatedValue, 0);
  const mixedSetCount = enrichedSets.filter((s) => s.quantity > 1).length;

  const potentialUpside = sellSets.reduce((sum, s) => sum + s.profitOpportunity, 0);
  const potentialUpsidePercent =
    sellValue > 0 ? Math.round((potentialUpside / sellValue) * 100) : 0;

  const topThemePercent = diversification?.themeSegments[0]?.percent ?? 0;
  const risk = computeRiskScore(synced, enrichedSets, topThemePercent);

  const opportunityScores = enrichedSets.map((s) => s.opportunity);
  const avgOpportunityScore = Math.round(
    opportunityScores.reduce((sum, o) => sum + o.opportunityScore, 0) /
      opportunityScores.length,
  );
  const opportunityBreakdown: Record<OpportunityLabel, number> = {
    Exceptional: 0,
    Strong: 0,
    Good: 0,
    Moderate: 0,
    Low: 0,
  };
  for (const o of opportunityScores) {
    opportunityBreakdown[o.opportunityLabel]++;
  }

  const topOpportunities = [...enrichedSets]
    .sort((a, b) => b.opportunity.opportunityScore - a.opportunity.opportunityScore)
    .slice(0, 3);

  const retiringSoonSets = enrichedSets.filter((s) => s.retiringSoon);
  const retiringSoonValue = retiringSoonSets.reduce(
    (sum, s) => sum + s.totalEstimatedValue,
    0,
  );
  const retiringSoonUpsideLow = Math.round(retiringSoonValue * 0.25);
  const retiringSoonUpsideHigh = Math.round(retiringSoonValue * 0.4);

  const themeRows = buildThemeRows(synced, enrichedSets);
  const bestTheme =
    themeRows.length > 0
      ? [...themeRows].sort((a, b) => b.avgRoiPercent - a.avgRoiPercent)[0]
      : null;
  const worstTheme =
    themeRows.length > 1
      ? [...themeRows].sort((a, b) => a.avgRoiPercent - b.avgRoiPercent)[0]
      : null;

  const totalCopies = metrics.totalCopyCount;
  const retiredCopies = enrichedSets
    .filter((s) => s.retired)
    .reduce((sum, s) => sum + s.quantity, 0);
  const activeCopies = enrichedSets
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.quantity, 0);
  const retiringSoonCopies = enrichedSets
    .filter((s) => s.retiringSoon)
    .reduce((sum, s) => sum + s.quantity, 0);

  let sealed = 0;
  let complete = 0;
  let incomplete = 0;
  for (const item of synced) {
    for (const copy of item.copies) {
      if (copy.condition === "sealed") sealed += 1;
      else if (copy.condition === "complete") complete += 1;
      else incomplete += 1;
    }
  }

  const collectionInsights: string[] = [];
  if (totalCopies > 0) {
    const retiredPct = Math.round((retiredCopies / totalCopies) * 100);
    if (retiredPct > 0) {
      collectionInsights.push(
        `${retiredPct}% of your collection is retired — strong scarcity profile`,
      );
    }
    const sealedPct = Math.round((sealed / totalCopies) * 100);
    if (sealedPct > 0) {
      collectionInsights.push(
        `${sealedPct}% sealed — accessing premium collector pricing`,
      );
    }
    if (retiringSoonCopies > 0) {
      collectionInsights.push(
        `${retiringSoonCopies} set${retiringSoonCopies === 1 ? "" : "s"} retiring soon — pre-retirement appreciation window open`,
      );
    }
  }

  const dominantTheme = diversification?.themeSegments[0];
  const diversificationText =
    dominantTheme && dominantTheme.percent > 50
      ? `Your portfolio is ${Math.round(dominantTheme.percent)}% ${dominantTheme.theme}. Consider adding ${diversification?.suggestions[0]?.theme ?? "another theme"} sets to reduce concentration risk.`
      : `Your portfolio spans ${diversification?.uniqueThemeCount ?? metrics.themeBreakdown.length} themes — well diversified for a LEGO collection.`;

  const holdRetiringCount = holdSets.filter((s) => s.retiringSoon).length;

  return {
    metrics,
    growthSummary,
    snapshots,
    milestones,
    monthlyRows,
    lastUpdated: new Date().toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    healthScore100: metrics.healthScore * 10,
    potentialUpside,
    potentialUpsidePercent,
    sellValue,
    holdValue,
    mixedSetCount,
    sellPriority: [...sellSets]
      .sort((a, b) => b.totalEstimatedValue - a.totalEstimatedValue)
      .slice(0, 5),
    riskScore: risk.score,
    riskLabel: risk.label,
    riskFactors: risk.factors,
    avgOpportunityScore,
    opportunityBreakdown,
    topOpportunities,
    retiringSoonSets,
    retiringSoonCount: retiringSoonSets.length,
    retiringSoonValue,
    retiringSoonUpsideLow,
    retiringSoonUpsideHigh,
    themeRows,
    bestTheme,
    worstTheme,
    composition: {
      retired: retiredCopies,
      active: activeCopies,
      retiringSoon: retiringSoonCopies,
      sealed,
      complete,
      incomplete,
      sell: metrics.sellCount,
      hold: metrics.holdCount,
      totalCopies,
      totalSets: metrics.uniqueSetCount,
    },
    collectionInsights,
    smartRecommendations: {
      actionNow: `You have ${sellSets.length} set${sellSets.length === 1 ? "" : "s"} with SELL recommendation worth a combined estimated value ready to list. Current market conditions are strong — consider listing your highest value SELL sets this month.`,
      holdStrategy:
        holdRetiringCount > 0
          ? `${holdRetiringCount} of your HOLD sets are retiring soon. Post-retirement appreciation typically begins within 3-6 months. Your patience on these sets is well positioned.`
          : `${holdSets.length} HOLD sets in your portfolio are positioned for longer-term appreciation. Monitor retirement announcements for timing opportunities.`,
      diversification: diversificationText,
    },
    diversification,
    enrichedSets,
  };
}

export function healthLabelColor(label: string): string {
  switch (label) {
    case "Excellent":
      return "text-emerald-400";
    case "Good":
      return "text-green-400";
    case "Fair":
      return "text-amber-400";
    default:
      return "text-red-400";
  }
}
