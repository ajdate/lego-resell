import type { Condition } from "@/lib/analyze-types";
import type { PortfolioItem } from "@/lib/portfolio";

export type RiskQuadrant = "Star Investment" | "Speculative" | "Safe Hold" | "Avoid";

export interface RiskRewardPoint {
  setNumber: string;
  name: string;
  theme: string;
  condition: Condition;
  estimatedValue: number;
  recommendation: "SELL" | "HOLD";
  retired: boolean;
  retiringSoon: boolean;
  returnScore: number;
  riskScore: number;
  volatilityScore: number;
  liquidityScore: number;
  quadrant: RiskQuadrant;
  inPortfolio: boolean;
  inWatchlist: boolean;
}

export type ThemeRiskProfile = {
  theme: string;
  avgReturn: number;
  avgRisk: number;
  avgVolatility: number;
  quadrant: RiskQuadrant;
  count: number;
};

export function quadrantForScores(returnScore: number, riskScore: number): RiskQuadrant {
  const highReturn = returnScore > 60;
  const highRisk = riskScore > 40;
  if (highReturn && !highRisk) return "Star Investment";
  if (highReturn && highRisk) return "Speculative";
  if (!highReturn && !highRisk) return "Safe Hold";
  return "Avoid";
}

export function buildThemeRiskProfiles(points: RiskRewardPoint[]): ThemeRiskProfile[] {
  const map = new Map<string, { r: number; k: number; v: number; c: number }>();
  for (const p of points) {
    const cur = map.get(p.theme) ?? { r: 0, k: 0, v: 0, c: 0 };
    cur.r += p.returnScore;
    cur.k += p.riskScore;
    cur.v += p.volatilityScore;
    cur.c += 1;
    map.set(p.theme, cur);
  }
  return [...map.entries()]
    .map(([theme, d]) => {
      const avgReturn = Math.round(d.r / d.c);
      const avgRisk = Math.round(d.k / d.c);
      const avgVolatility = Math.round(d.v / d.c);
      return {
        theme,
        avgReturn,
        avgRisk,
        avgVolatility,
        count: d.c,
        quadrant: quadrantForScores(avgReturn, avgRisk),
      };
    })
    .sort((a, b) => b.avgReturn - a.avgReturn);
}

export function summarizePortfolioRisk(points: RiskRewardPoint[], portfolio: PortfolioItem[]) {
  if (portfolio.length === 0) return null;
  const bySet = new Map(points.map((p) => [p.setNumber, p]));
  let totalQty = 0;
  let weightedRisk = 0;
  let weightedReturn = 0;
  const quadrantCounts: Record<RiskQuadrant, number> = {
    "Star Investment": 0,
    Speculative: 0,
    "Safe Hold": 0,
    Avoid: 0,
  };

  for (const item of portfolio) {
    const point = bySet.get(item.setNumber);
    if (!point) continue;
    totalQty += item.quantity;
    weightedRisk += point.riskScore * item.quantity;
    weightedReturn += point.returnScore * item.quantity;
    quadrantCounts[point.quadrant] += item.quantity;
  }
  const qty = totalQty || 1;
  const avgRisk = Math.round(weightedRisk / qty);
  const avgReturn = Math.round(weightedReturn / qty);
  const dominantQuadrant = (Object.entries(quadrantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Safe Hold") as RiskQuadrant;
  const starPct = Math.round((quadrantCounts["Star Investment"] / qty) * 100);
  const speculativePct = Math.round((quadrantCounts.Speculative / qty) * 100);
  const rebalanceSuggestion =
    Math.max(...Object.values(quadrantCounts)) / qty > 0.5
      ? `Over 50% of your portfolio sits in ${dominantQuadrant}. Consider adding sets from other quadrants to rebalance risk exposure.`
      : null;
  return {
    weightedRiskScore: avgRisk,
    weightedReturnScore: avgReturn,
    portfolioQuadrant: quadrantForScores(avgReturn, avgRisk),
    starPercent: starPct,
    speculativePercent: speculativePct,
    rebalanceSuggestion,
  };
}
