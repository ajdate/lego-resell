import { analyzeSet, findSet, isSetRetired, isSetRetiringSoon, type Condition } from "@/lib/analyze";
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function themeMultiplier(theme: string): number {
  if (theme === "Star Wars UCS" || theme === "UCS Star Wars") return 1.2;
  if (theme === "Modular") return 1.15;
  if (theme === "Ideas") return 1.1;
  return 1.0;
}

function isUcsOrModular(theme: string): boolean {
  return theme === "Modular" || theme === "Star Wars UCS" || theme === "UCS Star Wars";
}

export function quadrantForScores(returnScore: number, riskScore: number): RiskQuadrant {
  const highReturn = returnScore > 60;
  const highRisk = riskScore > 40;
  if (highReturn && !highRisk) return "Star Investment";
  if (highReturn && highRisk) return "Speculative";
  if (!highReturn && !highRisk) return "Safe Hold";
  return "Avoid";
}

export function computeReturnScore(setNumber: string, condition: Condition = "sealed"): number {
  const analysis = analyzeSet(setNumber, condition);
  if (!analysis) return 0;
  const set = analysis.set;
  const retired = isSetRetired(set);
  const retiringSoon = isSetRetiringSoon(set);

  let base = 30;
  if (retired) {
    if (set.year < 2015) base = 90;
    else if (set.year <= 2019) base = 80;
    else if (set.year <= 2022) base = 70;
    else base = 65;
  } else if (retiringSoon) {
    base = 75;
  } else if (isUcsOrModular(set.theme)) {
    base = 55;
  } else if (set.theme === "Creator Expert") {
    base = 45;
  }

  return clamp(Math.round(base * themeMultiplier(set.theme)), 0, 100);
}

export function computeRiskScore(
  setNumber: string,
  condition: Condition = "sealed",
  opts?: { inPortfolio?: boolean; themeDominancePercent?: number },
): number {
  const analysis = analyzeSet(setNumber, condition);
  if (!analysis) return 50;
  const set = analysis.set;
  let risk = 20;

  if (condition === "incomplete") risk += 30;
  if (analysis.recommendation === "SELL" && !set.retired) risk += 20;
  if (analysis.estimatedValue > 800) risk += 15;
  else if (analysis.estimatedValue > 400) risk += 8;
  if (opts?.inPortfolio && (opts.themeDominancePercent ?? 0) >= 50) risk += 10;
  if (set.retired && set.year < 2015) risk += 10;
  if (isSetRetiringSoon(set)) risk += 8;
  if (condition === "complete") risk += 5;
  if (condition === "sealed") risk -= 10;
  if (set.retired && analysis.recommendation === "SELL") risk -= 5;
  if (analysis.recommendation === "HOLD" && isUcsOrModular(set.theme)) risk -= 5;

  return clamp(Math.round(risk), 0, 100);
}

export function computeVolatilityScore(setNumber: string, condition: Condition = "sealed"): number {
  const analysis = analyzeSet(setNumber, condition);
  if (!analysis) return 0;
  const set = analysis.set;

  let score = 20;
  if (set.retired) {
    if (set.year < 2015) score = 25;
    else if (set.year <= 2019) score = 35;
    else if (set.year <= 2022) score = 50;
    else score = 45;
  } else if (isSetRetiringSoon(set)) {
    score = 65;
  }
  if (condition === "incomplete") score += 20;
  if (analysis.estimatedValue > 500) score += 10;
  return clamp(Math.round(score), 0, 100);
}

export function computeLiquidityScore(setNumber: string, condition: Condition = "sealed"): number {
  const analysis = analyzeSet(setNumber, condition);
  if (!analysis) return 0;
  let score = 25;
  if (analysis.estimatedValue < 150) score = 85;
  else if (analysis.estimatedValue <= 300) score = 70;
  else if (analysis.estimatedValue <= 500) score = 55;
  else if (analysis.estimatedValue <= 800) score = 40;
  if (analysis.recommendation === "SELL") score += 10;
  if (condition === "incomplete") score -= 20;
  return clamp(Math.round(score), 0, 100);
}

function portfolioThemeDominance(portfolio: PortfolioItem[]): Record<string, number> {
  const total = portfolio.reduce((sum, p) => sum + p.quantity, 0) || 1;
  const byTheme: Record<string, number> = {};
  for (const p of portfolio) byTheme[p.theme] = (byTheme[p.theme] ?? 0) + p.quantity;
  const out: Record<string, number> = {};
  for (const [theme, count] of Object.entries(byTheme)) out[theme] = Math.round((count / total) * 100);
  return out;
}

export function buildRiskRewardPoint(
  setNumber: string,
  condition: Condition,
  opts?: {
    portfolioSetNumbers?: Set<string>;
    watchlistSetNumbers?: Set<string>;
    themeDominancePercent?: number;
  },
): RiskRewardPoint | null {
  const analysis = analyzeSet(setNumber, condition);
  if (!analysis) return null;
  const inPortfolio = opts?.portfolioSetNumbers?.has(setNumber) ?? false;
  const inWatchlist = opts?.watchlistSetNumbers?.has(setNumber) ?? false;
  const returnScore = computeReturnScore(setNumber, condition);
  const riskScore = computeRiskScore(setNumber, condition, {
    inPortfolio,
    themeDominancePercent: opts?.themeDominancePercent ?? 0,
  });
  const volatilityScore = computeVolatilityScore(setNumber, condition);
  const liquidityScore = computeLiquidityScore(setNumber, condition);
  return {
    setNumber: analysis.set.number,
    name: analysis.set.name,
    theme: analysis.set.theme,
    condition,
    estimatedValue: analysis.estimatedValue,
    recommendation: analysis.recommendation,
    retired: isSetRetired(analysis.set),
    retiringSoon: isSetRetiringSoon(analysis.set),
    returnScore,
    riskScore,
    volatilityScore,
    liquidityScore,
    quadrant: quadrantForScores(returnScore, riskScore),
    inPortfolio,
    inWatchlist,
  };
}

export function buildRiskRewardDataset(params: {
  setNumbers: string[];
  condition?: Condition;
  portfolio?: PortfolioItem[];
  watchlistNumbers?: Set<string>;
}): RiskRewardPoint[] {
  const condition = params.condition ?? "sealed";
  const portfolio = params.portfolio ?? [];
  const portfolioSetNumbers = new Set(portfolio.map((p) => p.setNumber));
  const themeDominance = portfolioThemeDominance(portfolio);
  const watchSet = params.watchlistNumbers ?? new Set<string>();

  return params.setNumbers
    .map((setNumber) => {
      const set = findSet(setNumber);
      if (!set) return null;
      return buildRiskRewardPoint(setNumber, condition, {
        portfolioSetNumbers,
        watchlistSetNumbers: watchSet,
        themeDominancePercent: themeDominance[set.theme] ?? 0,
      });
    })
    .filter((p): p is RiskRewardPoint => p !== null);
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

