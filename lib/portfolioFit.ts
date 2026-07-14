import {
  isSetRetired,
  isSetRetiringSoon,
  type Analysis,
  type Condition,
} from "@/lib/analyze-types";
import { getTierForSetNumber } from "@/lib/retiring-soon";
import type { SetData } from "@/lib/confidence";
import { getThemeColor } from "@/lib/diversification";
import type { PortfolioItem } from "@/lib/portfolio";

export type PortfolioFitLabel =
  | "Excellent Fit"
  | "Good Fit"
  | "Neutral"
  | "Poor Fit"
  | "Avoid";

export type FitImpactType = "positive" | "negative" | "neutral";

export type RiskImpactLabel = "Reduces Risk" | "Neutral" | "Increases Risk";
export type LiquidityImpactLabel = "Improves" | "Neutral" | "Reduces";

export interface FitImpact {
  category: string;
  icon: string;
  label: string;
  impact: FitImpactType;
  score: number;
  explanation: string;
}

export interface ProfileFit {
  profile: "Conservative" | "Growth" | "Long-term Hold" | "Flip-focused";
  fitScore: number;
  reason: string;
}

export interface PortfolioFitResult {
  setNumber: string;
  setName: string;
  theme: string;
  fitScore: number;
  fitLabel: PortfolioFitLabel;
  diversificationImpact: number;
  riskImpact: RiskImpactLabel;
  liquidityImpact: LiquidityImpactLabel;
  themeConcentrationAfter: number;
  themeConcentrationBefore: number;
  isThemeOverweight: boolean;
  recommendation: string;
  impacts: FitImpact[];
  warnings: string[];
  strengths: string[];
  collectorProfileFit: ProfileFit[];
  bestProfile: ProfileFit["profile"];
}

export type PortfolioFitSetInput = SetData & {
  setNumber: string;
  setName: string;
  year?: number;
};

export type ThemeValueSegment = {
  theme: string;
  percent: number;
  valueAud: number;
  color: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function fitLabelFromScore(score: number): PortfolioFitLabel {
  if (score >= 80) return "Excellent Fit";
  if (score >= 65) return "Good Fit";
  if (score >= 45) return "Neutral";
  if (score >= 25) return "Poor Fit";
  return "Avoid";
}

export function fitLabelColorClass(label: PortfolioFitLabel): string {
  switch (label) {
    case "Excellent Fit":
      return "text-emerald-400";
    case "Good Fit":
      return "text-green-400";
    case "Neutral":
      return "text-amber-400";
    case "Poor Fit":
      return "text-orange-400";
    default:
      return "text-red-400";
  }
}

export function portfolioFitSetFromAnalysis(
  analysis: Analysis,
): PortfolioFitSetInput {
  return {
    setNumber: analysis.set.number,
    setName: analysis.set.name,
    theme: analysis.set.theme,
    pieces: analysis.set.pieces,
    retired: analysis.set.retired,
    retiringSoon: analysis.set.retiringSoon,
    recommendation: analysis.recommendation,
    estimatedValue: analysis.estimatedValue,
    year: analysis.set.year,
  };
}

export function getPortfolioTotalValue(portfolio: PortfolioItem[]): number {
  return portfolio.reduce((sum, i) => sum + i.totalEstimatedValue, 0);
}

export function computeThemeValueSegments(
  portfolio: PortfolioItem[],
  added?: { theme: string; valueAud: number },
): ThemeValueSegment[] {
  const map = new Map<string, number>();
  for (const item of portfolio) {
    map.set(item.theme, (map.get(item.theme) ?? 0) + item.totalEstimatedValue);
  }
  if (added) {
    map.set(added.theme, (map.get(added.theme) ?? 0) + added.valueAud);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
  return [...map.entries()]
    .map(([theme, valueAud]) => ({
      theme,
      valueAud,
      percent: Math.round((valueAud / total) * 100),
      color: getThemeColor(theme),
    }))
    .sort((a, b) => b.valueAud - a.valueAud);
}

function themeSharePercent(
  portfolio: PortfolioItem[],
  theme: string,
  extraValue = 0,
): number {
  const total =
    getPortfolioTotalValue(portfolio) + (extraValue > 0 ? extraValue : 0);
  if (total <= 0) return extraValue > 0 ? 100 : 0;
  let themeValue = extraValue;
  for (const item of portfolio) {
    if (item.theme === theme) themeValue += item.totalEstimatedValue;
  }
  return Math.round((themeValue / total) * 100);
}

function portfolioHasTheme(portfolio: PortfolioItem[], theme: string): boolean {
  return portfolio.some((i) => i.theme === theme);
}

function portfolioRetirementMix(portfolio: PortfolioItem[]) {
  let retired = 0;
  let retiringSoon = 0;
  let active = 0;
  for (const item of portfolio) {
    if (item.retired === true) {
      retired++;
    } else if (getTierForSetNumber(item.setNumber) || item.retiringSoon) {
      retiringSoon++;
    } else {
      active++;
    }
  }
  const total = retired + retiringSoon + active || 1;
  return {
    retiredPct: (retired / total) * 100,
    retiringSoonPct: (retiringSoon / total) * 100,
    activePct: (active / total) * 100,
    hasRetiringSoon: retiringSoon > 0,
    mostlyRetired: retired / total > 0.5,
    mostlyActive: active / total > 0.5,
  };
}

function portfolioRecommendationMix(portfolio: PortfolioItem[]) {
  const sell = portfolio.filter((i) => i.recommendation === "SELL").length;
  const hold = portfolio.length - sell;
  const total = portfolio.length || 1;
  return {
    sellPct: (sell / total) * 100,
    holdPct: (hold / total) * 100,
    mostlySell: sell / total > 0.5,
    mostlyHold: hold / total > 0.5,
  };
}

function portfolioAvgValue(portfolio: PortfolioItem[]): number {
  if (portfolio.length === 0) return 0;
  return getPortfolioTotalValue(portfolio) / portfolio.length;
}

function countHighValueSets(
  portfolio: PortfolioItem[],
  threshold = 500,
): number {
  return portfolio.filter((i) => i.estimatedValue >= threshold).length;
}

function isUcsOrModular(theme: string): boolean {
  return (
    theme === "Modular" ||
    theme === "Star Wars UCS" ||
    theme === "UCS Star Wars"
  );
}

function addImpact(
  impacts: FitImpact[],
  impact: FitImpact,
  scoreDelta: number,
): number {
  impacts.push(impact);
  return scoreDelta;
}

function computeProfileFits(
  set: PortfolioFitSetInput,
  purchasePrice: number,
  themePctAfter: number,
  isOverweight: boolean,
): ProfileFit[] {
  const retired = set.retired === true;
  const retiringSoon = set.retiringSoon === true && !retired;
  const ucsMod = isUcsOrModular(set.theme);

  let conservative = 50;
  if (retired && set.recommendation === "SELL") conservative += 20;
  if (purchasePrice < 300) conservative += 15;
  if (!isOverweight) conservative += 10;
  if (!retired && purchasePrice > 500) conservative -= 25;
  if (set.recommendation === "HOLD" && !retired) conservative -= 15;

  let growth = 50;
  if (retiringSoon) growth += 30;
  if (retired && ucsMod) growth += 25;
  if (retired && !ucsMod) growth += 10;
  if (!retired && !retiringSoon) growth -= 20;

  let longTerm = 50;
  if (!retired && set.recommendation === "HOLD") longTerm += 25;
  if (purchasePrice < 400) longTerm += 10;
  if (retired && set.estimatedValue > 800) longTerm -= 20;
  if (isUcsOrModular(set.theme) && !retired) longTerm += 10;

  let flip = 50;
  if (set.recommendation === "SELL" && purchasePrice < 200) flip += 30;
  if (!isOverweight) flip += 10;
  if (set.recommendation === "HOLD" && !retired) flip -= 15;
  if (purchasePrice > 500) flip -= 20;

  const profiles: ProfileFit[] = [
    {
      profile: "Conservative",
      fitScore: clamp(conservative, 0, 100),
      reason:
        conservative >= 70
          ? "Retired or liquid with clear exit signals"
          : "Higher risk or capital lock-up vs conservative goals",
    },
    {
      profile: "Growth",
      fitScore: clamp(growth, 0, 100),
      reason:
        growth >= 70
          ? "Strong retirement or premium theme upside"
          : "Limited near-term appreciation catalyst",
    },
    {
      profile: "Long-term Hold",
      fitScore: clamp(longTerm, 0, 100),
      reason:
        longTerm >= 70
          ? "Active hold with room to compound"
          : "May already be priced for peak demand",
    },
    {
      profile: "Flip-focused",
      fitScore: clamp(flip, 0, 100),
      reason:
        flip >= 70
          ? "SELL signal and accessible price point"
          : "Slower turnover or heavy capital required",
    },
  ];

  return profiles;
}

function buildRecommendationParagraph(
  set: PortfolioFitSetInput,
  portfolio: PortfolioItem[],
  themePctBefore: number,
  themePctAfter: number,
  isOverweight: boolean,
): string {
  const themeCount = portfolio.filter((i) => i.theme === set.theme).length;
  const uniqueThemes = new Set(portfolio.map((i) => i.theme)).size;
  const dominant = computeThemeValueSegments(portfolio)[0];

  if (!portfolioHasTheme(portfolio, set.theme)) {
    return `Your portfolio spans ${uniqueThemes} theme${uniqueThemes === 1 ? "" : "s"} with no ${set.theme} exposure today. Adding ${set.setName} would introduce ${set.theme} at roughly ${themePctAfter}% of portfolio value — a meaningful diversification move. This helps balance${dominant ? ` your current tilt toward ${dominant.theme} (${dominant.percent}%)` : " concentration risk"}.`;
  }

  if (isOverweight) {
    return `You currently have ${themeCount} ${set.theme} set${themeCount === 1 ? "" : "s"} representing ${themePctBefore}% of portfolio value. Adding ${set.setName} would push ${set.theme} to ${themePctAfter}% — above healthy diversification levels. Consider whether this concentration aligns with your strategy.`;
  }

  const delta = themePctAfter - themePctBefore;
  if (delta <= 0) {
    return `Adding ${set.setName} keeps ${set.theme} at ${themePctAfter}% of portfolio value — broadly in line with your current mix. With ${themeCount} existing ${set.theme} holding${themeCount === 1 ? "" : "s"}, this is a complementary addition rather than a major shift.`;
  }

  return `You currently have ${themeCount} ${set.theme} set${themeCount === 1 ? "" : "s"} at ${themePctBefore}% of portfolio value. Adding ${set.setName} brings ${set.theme} to ${themePctAfter}% (+${delta}%). ${delta <= 8 ? "This is a modest shift that stays within a balanced range." : "Monitor concentration if you plan more additions in the same theme."}`;
}

export function analysePortfolioFit(
  set: PortfolioFitSetInput,
  condition: Condition,
  purchasePrice: number,
  portfolio: PortfolioItem[],
): PortfolioFitResult {
  const impacts: FitImpact[] = [];
  let score = 50;
  let divImpactSum = 0;
  let riskScore = 0;
  let liqScore = 0;

  const addedValue = Math.max(
    set.estimatedValue,
    purchasePrice > 0 ? purchasePrice : set.estimatedValue,
  );
  const themePctBefore = themeSharePercent(portfolio, set.theme);
  const themePctAfter = themeSharePercent(portfolio, set.theme, addedValue);
  const isOverweight = themePctAfter > 40;

  if (portfolio.length === 0) {
    const label = fitLabelFromScore(75);
    return {
      setNumber: set.setNumber,
      setName: set.setName,
      theme: set.theme,
      fitScore: 75,
      fitLabel: label,
      diversificationImpact: 20,
      riskImpact: "Neutral",
      liquidityImpact: "Neutral",
      themeConcentrationAfter: 100,
      themeConcentrationBefore: 0,
      isThemeOverweight: false,
      recommendation: `${set.setName} would be your first portfolio holding — an excellent starting point to build around ${set.theme}.`,
      impacts: [
        {
          category: "diversification",
          icon: "✦",
          label: "First holding",
          impact: "positive",
          score: 20,
          explanation: "No existing concentration — clean slate.",
        },
      ],
      warnings: [],
      strengths: ["✦ First set in your portfolio — no concentration drag."],
      collectorProfileFit: (() => {
        const profiles = computeProfileFits(
          set,
          purchasePrice,
          100,
          false,
        );
        return profiles;
      })(),
      bestProfile: computeProfileFits(set, purchasePrice, 100, false).sort(
        (a, b) => b.fitScore - a.fitScore,
      )[0].profile,
    };
  }

  const hasTheme = portfolioHasTheme(portfolio, set.theme);
  if (!hasTheme) {
    score += addImpact(impacts, {
      category: "diversification",
      icon: "✦",
      label: "Adds new theme",
      impact: "positive",
      score: 20,
      explanation: `${set.theme} is not represented in your portfolio yet.`,
    }, 20);
    divImpactSum += 20;
  } else if (themePctBefore < 20) {
    score += addImpact(impacts, {
      category: "diversification",
      icon: "✦",
      label: "Well balanced addition",
      impact: "positive",
      score: 10,
      explanation: `${set.theme} is under 20% of portfolio value today.`,
    }, 10);
    divImpactSum += 10;
  } else if (themePctBefore < 40) {
    divImpactSum += 0;
  } else if (themePctBefore < 60) {
    score += addImpact(impacts, {
      category: "diversification",
      icon: "⚠",
      label: "Increases concentration",
      impact: "negative",
      score: -10,
      explanation: `${set.theme} is already ${themePctBefore}% of portfolio value.`,
    }, -10);
    divImpactSum -= 10;
  } else {
    score += addImpact(impacts, {
      category: "diversification",
      icon: "✕",
      label: "High concentration risk",
      impact: "negative",
      score: -20,
      explanation: `${set.theme} already exceeds 60% of portfolio value.`,
    }, -20);
    divImpactSum -= 20;
  }

  const mix = portfolioRetirementMix(portfolio);
  const setRetired = set.retired === true;
  const setRetiringSoon = set.retiringSoon === true && !setRetired;
  const setActive = !setRetired && !setRetiringSoon;

  if (setRetiringSoon && !mix.hasRetiringSoon) {
    score += addImpact(impacts, {
      category: "timing",
      icon: "✦",
      label: "Pre-retirement window",
      impact: "positive",
      score: 15,
      explanation: "Your portfolio has no retiring-soon sets — adds timing diversity.",
    }, 15);
  } else if (setRetired && mix.mostlyActive) {
    score += addImpact(impacts, {
      category: "timing",
      icon: "✦",
      label: "Adds scarcity",
      impact: "positive",
      score: 10,
      explanation: "Portfolio is mostly active — retired stock adds scarcity exposure.",
    }, 10);
    riskScore -= 5;
  } else if (setActive && mix.mostlyRetired) {
    score += addImpact(impacts, {
      category: "timing",
      icon: "✦",
      label: "Adds liquidity",
      impact: "positive",
      score: 10,
      explanation: "Portfolio is mostly retired — active set improves liquidity mix.",
    }, 10);
    liqScore += 5;
  }

  const avgVal = portfolioAvgValue(portfolio);
  const highValueCount = countHighValueSets(portfolio);

  if (set.estimatedValue < 200 && avgVal > 400) {
    score += addImpact(impacts, {
      category: "liquidity",
      icon: "✦",
      label: "Improves liquidity",
      impact: "positive",
      score: 10,
      explanation: "Lower price point vs your portfolio average — easier to move.",
    }, 10);
    liqScore += 10;
  } else if (set.estimatedValue > 500 && highValueCount < 2) {
    score += addImpact(impacts, {
      category: "liquidity",
      icon: "✦",
      label: "Premium anchor",
      impact: "positive",
      score: 5,
      explanation: "Adds a flagship holding without overcrowding premium tier.",
    }, 5);
    liqScore += 5;
  } else if (set.estimatedValue > 500 && highValueCount >= 3) {
    score += addImpact(impacts, {
      category: "liquidity",
      icon: "⚠",
      label: "Heavy premium stack",
      impact: "negative",
      score: -10,
      explanation: "You already hold several high-value sets — liquidity may suffer.",
    }, -10);
    liqScore -= 10;
  }

  const recMix = portfolioRecommendationMix(portfolio);
  if (set.recommendation === "SELL" && recMix.mostlyHold) {
    score += addImpact(impacts, {
      category: "risk",
      icon: "✦",
      label: "Balances sell opportunities",
      impact: "positive",
      score: 10,
      explanation: "Adds a SELL signal while portfolio skews HOLD.",
    }, 10);
    riskScore -= 8;
  } else if (set.recommendation === "HOLD" && recMix.mostlySell) {
    score += addImpact(impacts, {
      category: "risk",
      icon: "✦",
      label: "Balances long-term holds",
      impact: "positive",
      score: 10,
      explanation: "Adds HOLD exposure while portfolio skews SELL.",
    }, 10);
    riskScore -= 8;
  } else if (
    (set.recommendation === "SELL" && recMix.mostlySell) ||
    (set.recommendation === "HOLD" && recMix.mostlyHold)
  ) {
    score += addImpact(impacts, {
      category: "risk",
      icon: "⚠",
      label: "Same signal as majority",
      impact: "neutral",
      score: -5,
      explanation: "Matches most of your portfolio — less diversification of strategy.",
    }, -5);
    riskScore += 3;
  }

  if (purchasePrice > 0 && purchasePrice < 150) {
    score += addImpact(impacts, {
      category: "capital",
      icon: "✦",
      label: "Affordable entry",
      impact: "positive",
      score: 5,
      explanation: "Lower capital outlay at your stated purchase price.",
    }, 5);
  } else if (purchasePrice > 800) {
    score += addImpact(impacts, {
      category: "capital",
      icon: "✕",
      label: "Major capital commitment",
      impact: "negative",
      score: -10,
      explanation: "Significant capital concentration in one purchase.",
    }, -10);
    riskScore += 8;
  } else if (purchasePrice > 400) {
    score += addImpact(impacts, {
      category: "capital",
      icon: "⚠",
      label: "Significant capital commitment",
      impact: "negative",
      score: -5,
      explanation: "Meaningful capital allocation vs typical portfolio entries.",
    }, -5);
    riskScore += 4;
  }

  if (condition === "incomplete") {
    score += addImpact(impacts, {
      category: "condition",
      icon: "✕",
      label: "Incomplete condition",
      impact: "negative",
      score: -15,
      explanation: "Incomplete copies reduce buyer pool and liquidity.",
    }, -15);
    liqScore -= 12;
    riskScore += 10;
  } else if (condition === "complete") {
    score += addImpact(impacts, {
      category: "condition",
      icon: "⚠",
      label: "Complete (not sealed)",
      impact: "neutral",
      score: -5,
      explanation: "Complete sets trade at a discount vs sealed for most themes.",
    }, -5);
    liqScore -= 3;
  }

  const fitScore = clamp(Math.round(score), 0, 100);
  const fitLabel = fitLabelFromScore(fitScore);

  const warnings: string[] = [];
  const strengths: string[] = [];

  if (isOverweight) {
    warnings.push(
      `⚠️ Adding this set brings ${set.theme} to ${themePctAfter}% of portfolio — well above healthy diversification levels.`,
    );
  }
  if (!hasTheme) {
    strengths.push(
      `✦ This is your first ${set.theme} set — excellent for diversification.`,
    );
  }
  if (setRetiringSoon && !mix.hasRetiringSoon) {
    strengths.push(
      "✦ Adds pre-retirement upside — your portfolio had no retiring-soon exposure.",
    );
  }
  if (fitScore >= 80) {
    strengths.push("✦ Strong overall alignment with your current portfolio mix.");
  }
  if (fitScore < 30) {
    warnings.push(
      "⚠️ Multiple factors suggest this set may not suit your current portfolio strategy.",
    );
  }

  const collectorProfileFit = computeProfileFits(
    set,
    purchasePrice,
    themePctAfter,
    isOverweight,
  );
  const bestProfile = [...collectorProfileFit].sort(
    (a, b) => b.fitScore - a.fitScore,
  )[0].profile;

  let riskImpact: RiskImpactLabel = "Neutral";
  if (riskScore <= -5) riskImpact = "Reduces Risk";
  else if (riskScore >= 5) riskImpact = "Increases Risk";

  let liquidityImpact: LiquidityImpactLabel = "Neutral";
  if (liqScore >= 5) liquidityImpact = "Improves";
  else if (liqScore <= -5) liquidityImpact = "Reduces";

  return {
    setNumber: set.setNumber,
    setName: set.setName,
    theme: set.theme,
    fitScore,
    fitLabel,
    diversificationImpact: divImpactSum,
    riskImpact,
    liquidityImpact,
    themeConcentrationAfter: themePctAfter,
    themeConcentrationBefore: themePctBefore,
    isThemeOverweight: isOverweight,
    recommendation: buildRecommendationParagraph(
      set,
      portfolio,
      themePctBefore,
      themePctAfter,
      isOverweight,
    ),
    impacts,
    warnings,
    strengths,
    collectorProfileFit,
    bestProfile,
  };
}

export function analysePortfolioFitFromAnalysis(
  analysis: Analysis,
  condition: Condition,
  purchasePrice: number,
  portfolio: PortfolioItem[],
): PortfolioFitResult {
  const effectivePrice =
    purchasePrice > 0 ? purchasePrice : analysis.estimatedValue;
  return analysePortfolioFit(
    portfolioFitSetFromAnalysis(analysis),
    condition,
    effectivePrice,
    portfolio,
  );
}

export function comparePortfolioFit(
  setA: PortfolioFitSetInput,
  condA: Condition,
  priceA: number,
  setB: PortfolioFitSetInput,
  condB: Condition,
  priceB: number,
  portfolio: PortfolioItem[],
): {
  resultA: PortfolioFitResult;
  resultB: PortfolioFitResult;
  winner: "a" | "b" | "tie";
} {
  const resultA = analysePortfolioFit(setA, condA, priceA, portfolio);
  const resultB = analysePortfolioFit(setB, condB, priceB, portfolio);
  const diff = Math.abs(resultA.fitScore - resultB.fitScore);
  let winner: "a" | "b" | "tie" = "tie";
  if (diff > 5) {
    winner = resultA.fitScore > resultB.fitScore ? "a" : "b";
  }
  return { resultA, resultB, winner };
}
