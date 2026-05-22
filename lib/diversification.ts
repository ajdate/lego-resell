import {
  analyzeSet,
  findSet,
  getAllSets,
  getRetiringSoonSets,
  isSetRetired,
  isSetRetiringSoon,
  type LegoSet,
} from "@/lib/analyze";
import type { PortfolioItem } from "@/lib/portfolio";

export type ConcentrationLevel =
  | "High Concentration Risk"
  | "Moderate Concentration"
  | "Balanced"
  | "Well Diversified";

export type PriceBracket = "budget" | "mid" | "premium";

export const THEME_COLOR_PALETTE: Record<string, string> = {
  "Star Wars UCS": "#3b82f6",
  "UCS Star Wars": "#3b82f6",
  Modular: "#22c55e",
  "Creator Expert": "#f59e0b",
  Icons: "#a855f7",
  Technic: "#f97316",
  Ideas: "#ec4899",
  Architecture: "#06b6d4",
};

export const THEME_COLOR_OTHER = "#6b7280";

export function getThemeColor(theme: string): string {
  return THEME_COLOR_PALETTE[theme] ?? THEME_COLOR_OTHER;
}

export function isUcsTheme(theme: string): boolean {
  return theme === "Star Wars UCS" || theme === "UCS Star Wars";
}

export function getConcentrationLevel(percent: number): ConcentrationLevel {
  if (percent > 60) return "High Concentration Risk";
  if (percent >= 40) return "Moderate Concentration";
  if (percent >= 20) return "Balanced";
  return "Well Diversified";
}

export function getDiversificationLabel(score: number): string {
  if (score >= 80) return "Excellently Diversified";
  if (score >= 60) return "Well Diversified";
  if (score >= 40) return "Moderately Diversified";
  if (score >= 20) return "Concentrated";
  return "Highly Concentrated";
}

export function getDiversificationScoreStyles(score: number): {
  color: string;
  bg: string;
  border: string;
  bar: string;
} {
  if (score >= 80) {
    return {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      bar: "bg-emerald-500",
    };
  }
  if (score >= 60) {
    return {
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      bar: "bg-green-500",
    };
  }
  if (score >= 40) {
    return {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      bar: "bg-amber-500",
    };
  }
  return {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    bar: "bg-red-500",
  };
}

function themeBaseScore(uniqueThemeCount: number): number {
  if (uniqueThemeCount >= 6) return 90;
  if (uniqueThemeCount === 5) return 75;
  if (uniqueThemeCount === 4) return 60;
  if (uniqueThemeCount === 3) return 45;
  if (uniqueThemeCount === 2) return 25;
  if (uniqueThemeCount === 1) return 10;
  return 0;
}

export function getPriceBracketUsd(usd: number): PriceBracket {
  if (usd < 150) return "budget";
  if (usd <= 400) return "mid";
  return "premium";
}

export interface ThemeSegment {
  theme: string;
  color: string;
  setCount: number;
  totalValueAud: number;
  percent: number;
  concentration: ConcentrationLevel;
}

export interface BracketBreakdown {
  bracket: PriceBracket;
  label: string;
  setCount: number;
  totalValueAud: number;
  percent: number;
}

export interface DiversificationTip {
  id: string;
  message: string;
  priority: number;
}

export interface SuggestedAddition {
  setNumber: string;
  name: string;
  theme: string;
  estimatedValueUsd: number;
  reason: string;
}

export interface DiversificationInsights {
  score: number;
  label: string;
  uniqueThemeCount: number;
  totalCopyCount: number;
  shortInsight: string;
  themeSegments: ThemeSegment[];
  brackets: BracketBreakdown[];
  retiredPercent: number;
  activePercent: number;
  retiredInsight: string | null;
  tips: DiversificationTip[];
  suggestions: SuggestedAddition[];
}

function getEstimatedUsd(item: PortfolioItem): number {
  const analysis = analyzeSet(item.setNumber, "sealed");
  return analysis?.estimatedValue ?? item.estimatedValue / 1.55;
}

export function calculateDiversificationScore(
  items: PortfolioItem[],
  hasRetiredAndActive: boolean,
  bracketCount: number,
): number {
  const themes = new Set(items.map((i) => i.theme));
  let score = themeBaseScore(themes.size);
  if (hasRetiredAndActive) score += 10;
  if (bracketCount >= 3) score += 5;
  return Math.min(100, score);
}

function findTopSetOutsidePortfolio(
  predicate: (set: LegoSet) => boolean,
  owned: Set<string>,
): SuggestedAddition | null {
  const candidates = getAllSets()
    .filter((s) => predicate(s) && !owned.has(s.number))
    .map((s) => {
      const analysis = analyzeSet(s.number, "sealed");
      if (!analysis) return null;
      return { set: s, analysis };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.analysis.estimatedValue - a.analysis.estimatedValue);

  const top = candidates[0];
  if (!top) return null;
  return {
    setNumber: top.set.number,
    name: top.set.name,
    theme: top.set.theme,
    estimatedValueUsd: top.analysis.estimatedValue,
    reason: "",
  };
}

export function generateDiversificationTips(
  insights: Omit<DiversificationInsights, "tips" | "suggestions"> & {
    hasModular: boolean;
    hasUcs: boolean;
    hasRetired: boolean;
    hasActive: boolean;
    ucsPercent: number;
    onlyPremium: boolean;
    dominantTheme: string | null;
  },
): DiversificationTip[] {
  const tips: DiversificationTip[] = [];

  if (insights.uniqueThemeCount === 1 && insights.dominantTheme) {
    tips.push({
      id: "single-theme",
      message: `⚠️ Your entire portfolio is in ${insights.dominantTheme}. Consider diversifying into Modulars or UCS sets.`,
      priority: 10,
    });
  }

  if (insights.ucsPercent > 50) {
    tips.push({
      id: "ucs-heavy",
      message:
        "⚠️ Heavy UCS exposure. UCS sets are high value but illiquid — ensure you have lower-value sets for quicker sells.",
      priority: 9,
    });
  }

  if (!insights.hasRetired) {
    tips.push({
      id: "no-retired",
      message:
        "💡 You have no retired sets. Retired sets typically command the strongest premiums.",
      priority: 8,
    });
  }

  if (!insights.hasActive) {
    tips.push({
      id: "no-active",
      message:
        "💡 All your sets are retired. Consider adding retiring-soon sets to build future appreciation.",
      priority: 8,
    });
  }

  if (insights.onlyPremium) {
    tips.push({
      id: "premium-only",
      message:
        "💡 Your portfolio is premium-heavy. Lower value sets sell faster and provide liquidity.",
      priority: 7,
    });
  }

  if (insights.score >= 80) {
    tips.push({
      id: "well-diversified",
      message:
        "✦ Excellent diversification. Your portfolio is well balanced across themes and price points.",
      priority: 5,
    });
  }

  return tips.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

export function generateSuggestedAdditions(
  items: PortfolioItem[],
  hasModular: boolean,
  hasUcs: boolean,
  hasRetiringSoonInPortfolio: boolean,
): SuggestedAddition[] {
  const owned = new Set(items.map((i) => i.setNumber));
  const suggestions: SuggestedAddition[] = [];

  if (!hasModular) {
    const mod = findTopSetOutsidePortfolio((s) => s.theme === "Modular", owned);
    if (mod) {
      suggestions.push({
        ...mod,
        reason: "Adds Modular exposure — strong long-term collector demand",
      });
      owned.add(mod.setNumber);
    }
  }

  if (!hasUcs) {
    const ucs = findTopSetOutsidePortfolio((s) => isUcsTheme(s.theme), owned);
    if (ucs) {
      suggestions.push({
        ...ucs,
        reason: "Adds UCS premium demand and flagship appreciation potential",
      });
      owned.add(ucs.setNumber);
    }
  }

  if (!hasRetiringSoonInPortfolio) {
    const retiring = getRetiringSoonSets()
      .filter((s) => !owned.has(s.number))
      .map((s) => {
        const analysis = analyzeSet(s.number, "sealed");
        return analysis ? { set: s, analysis } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.analysis.estimatedValue - a.analysis.estimatedValue)[0];

    if (retiring) {
      suggestions.push({
        setNumber: retiring.set.number,
        name: retiring.set.name,
        theme: retiring.set.theme,
        estimatedValueUsd: retiring.analysis.estimatedValue,
        reason: "Retiring soon — buy before retirement window closes",
      });
    }
  }

  return suggestions.slice(0, 3);
}

export function computeDiversificationInsights(
  items: PortfolioItem[],
): DiversificationInsights | null {
  if (items.length === 0) return null;

  const synced = items.map((i) => i);
  const totalValueAud = synced.reduce(
    (sum, i) => sum + i.totalEstimatedValue,
    0,
  );
  const totalCopyCount = synced.reduce((sum, i) => sum + i.quantity, 0);

  const themeMap = new Map<
    string,
    { setCount: number; totalValueAud: number }
  >();
  for (const item of synced) {
    const cur = themeMap.get(item.theme) ?? { setCount: 0, totalValueAud: 0 };
    themeMap.set(item.theme, {
      setCount: cur.setCount + 1,
      totalValueAud: cur.totalValueAud + item.totalEstimatedValue,
    });
  }

  const themeSegments: ThemeSegment[] = [...themeMap.entries()]
    .map(([theme, data]) => {
      const percent =
        totalValueAud > 0
          ? Math.round((data.totalValueAud / totalValueAud) * 100)
          : 0;
      return {
        theme,
        color: getThemeColor(theme),
        setCount: data.setCount,
        totalValueAud: data.totalValueAud,
        percent,
        concentration: getConcentrationLevel(percent),
      };
    })
    .sort((a, b) => b.totalValueAud - a.totalValueAud);

  const bracketDefs: { bracket: PriceBracket; label: string }[] = [
    { bracket: "budget", label: "Budget (under $150)" },
    { bracket: "mid", label: "Mid-Range ($150–$400)" },
    { bracket: "premium", label: "Premium (over $400)" },
  ];

  const bracketTotals = new Map<
    PriceBracket,
    { setCount: number; totalValueAud: number }
  >();
  for (const def of bracketDefs) {
    bracketTotals.set(def.bracket, { setCount: 0, totalValueAud: 0 });
  }

  let hasRetired = false;
  let hasActive = false;
  let hasRetiringSoonInPortfolio = false;

  for (const item of synced) {
    const set = findSet(item.setNumber);
    const usd = getEstimatedUsd(item);
    const bracket = getPriceBracketUsd(usd);
    const b = bracketTotals.get(bracket)!;
    bracketTotals.set(bracket, {
      setCount: b.setCount + 1,
      totalValueAud: b.totalValueAud + item.totalEstimatedValue,
    });

    if (set?.retired) hasRetired = true;
    else hasActive = true;
    if (isSetRetiringSoon(set)) hasRetiringSoonInPortfolio = true;
  }

  const brackets: BracketBreakdown[] = bracketDefs.map(({ bracket, label }) => {
    const data = bracketTotals.get(bracket)!;
    return {
      bracket,
      label,
      setCount: data.setCount,
      totalValueAud: data.totalValueAud,
      percent:
        totalValueAud > 0
          ? Math.round((data.totalValueAud / totalValueAud) * 100)
          : 0,
    };
  });

  const bracketsUsed = brackets.filter((b) => b.setCount > 0).length;
  const hasRetiredAndActive = hasRetired && hasActive;
  const uniqueThemeCount = themeMap.size;
  const score = calculateDiversificationScore(
    synced,
    hasRetiredAndActive,
    bracketsUsed,
  );
  const label = getDiversificationLabel(score);

  let retiredValueAud = 0;
  for (const item of synced) {
    const set = findSet(item.setNumber);
    if (isSetRetired(set)) retiredValueAud += item.totalEstimatedValue;
  }
  const retiredPercent =
    totalValueAud > 0
      ? Math.round((retiredValueAud / totalValueAud) * 100)
      : 0;
  const activePercent = 100 - retiredPercent;

  let retiredInsight: string | null = null;
  if (retiredPercent > 70) {
    retiredInsight =
      "Strong collector focus — consider adding active sets for liquidity";
  } else if (retiredPercent < 30) {
    retiredInsight =
      "Consider adding retired sets for appreciation potential";
  }

  const ucsValue = themeSegments
    .filter((t) => isUcsTheme(t.theme))
    .reduce((sum, t) => sum + t.totalValueAud, 0);
  const ucsPercent =
    totalValueAud > 0 ? Math.round((ucsValue / totalValueAud) * 100) : 0;

  const onlyPremium =
    brackets.find((b) => b.bracket === "premium")?.setCount === synced.length;

  const base = {
    score,
    label,
    uniqueThemeCount,
    totalCopyCount,
    shortInsight: `Your portfolio spans ${uniqueThemeCount} theme${uniqueThemeCount === 1 ? "" : "s"} with ${totalCopyCount} ${totalCopyCount === 1 ? "copy" : "copies"}`,
    themeSegments,
    brackets,
    retiredPercent,
    activePercent,
    retiredInsight,
    hasModular: themeMap.has("Modular"),
    hasUcs: themeSegments.some((t) => isUcsTheme(t.theme)),
    hasRetired,
    hasActive,
    ucsPercent,
    onlyPremium,
    dominantTheme:
      uniqueThemeCount === 1 ? (themeSegments[0]?.theme ?? null) : null,
  };

  const tips = generateDiversificationTips(base);
  const suggestions = generateSuggestedAdditions(
    synced,
    base.hasModular,
    base.hasUcs,
    hasRetiringSoonInPortfolio,
  );

  return {
    score: base.score,
    label: base.label,
    uniqueThemeCount: base.uniqueThemeCount,
    totalCopyCount: base.totalCopyCount,
    shortInsight: base.shortInsight,
    themeSegments: base.themeSegments,
    brackets: base.brackets,
    retiredPercent: base.retiredPercent,
    activePercent: base.activePercent,
    retiredInsight: base.retiredInsight,
    tips,
    suggestions,
  };
}
