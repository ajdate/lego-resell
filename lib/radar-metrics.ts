import type { Analysis, Condition, Recommendation } from "@/lib/analyze";
import { isSetRetired, isSetRetiringSoon } from "@/lib/analyze";
import type { ComparedSetData } from "@/lib/set-comparison";
import { getTierForSetNumber } from "@/lib/retiring-soon";

export const RADAR_METRIC_KEYS = [
  "roiPotential",
  "demand",
  "liquidity",
  "risk",
  "rarity",
  "retirementStrength",
  "growthMomentum",
  "confidence",
] as const;

export type RadarMetricKey = (typeof RADAR_METRIC_KEYS)[number];

export type RadarMetrics = Record<RadarMetricKey, number>;

export const RADAR_METRIC_DEFS: {
  key: RadarMetricKey;
  shortLabel: string;
  fullName: string;
}[] = [
  { key: "roiPotential", shortLabel: "ROI", fullName: "ROI Potential" },
  { key: "demand", shortLabel: "Demand", fullName: "Demand" },
  { key: "liquidity", shortLabel: "Liquidity", fullName: "Liquidity" },
  { key: "risk", shortLabel: "Risk", fullName: "Risk" },
  { key: "rarity", shortLabel: "Rarity", fullName: "Rarity" },
  {
    key: "retirementStrength",
    shortLabel: "Retirement",
    fullName: "Retirement Strength",
  },
  { key: "growthMomentum", shortLabel: "Momentum", fullName: "Growth Momentum" },
  { key: "confidence", shortLabel: "Confidence", fullName: "Confidence" },
];

type RetirementEra =
  | "active"
  | "retiringSoon"
  | "retired2020plus"
  | "retired2015to2019"
  | "retiredPre2015";

function isUcsTheme(theme: string): boolean {
  return theme === "Star Wars UCS" || theme === "UCS Star Wars";
}

function isModular(theme: string): boolean {
  return theme === "Modular";
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function getRetirementEra(set: Analysis["set"]): RetirementEra {
  if (isSetRetiringSoon(set)) return "retiringSoon";
  if (!isSetRetired(set)) return "active";
  const y = set.year;
  if (y < 2015) return "retiredPre2015";
  if (y <= 2019) return "retired2015to2019";
  return "retired2020plus";
}

function scoreRoiPotential(
  era: RetirementEra,
  opportunity: ComparedSetData["opportunity"],
): number {
  let base: number;
  switch (era) {
    case "retiringSoon":
      base = 90;
      break;
    case "retired2020plus":
      base = 75;
      break;
    case "retired2015to2019":
      base = 65;
      break;
    case "retiredPre2015":
      base = 55;
      break;
    default:
      base = 30;
  }
  const roiBoost = Math.min(15, Math.round(opportunity.projectedROI12m / 4));
  return clampScore(base + roiBoost * 0.5);
}

function scoreDemand(set: Analysis["set"], era: RetirementEra): number {
  const { theme } = set;
  const retired = era !== "active" && era !== "retiringSoon";
  const ucs = isUcsTheme(theme);

  if (ucs && retired) return 95;
  if (isModular(theme) && retired) return 90;
  if (ucs && era === "active") return 80;
  if (theme === "Ideas" && retired) return 75;
  if (theme === "Creator Expert" && retired) return 70;
  if (theme === "Technic" && retired) return 60;
  if (era === "active") return 40;
  if (retired) return 55;
  return 45;
}

function scoreLiquidity(
  estimatedValue: number,
  recommendation: Recommendation,
): number {
  if (recommendation === "HOLD") return 35;
  if (estimatedValue < 150) return 90;
  if (estimatedValue < 300) return 75;
  if (estimatedValue < 500) return 60;
  return 45;
}

function scoreRisk(
  era: RetirementEra,
  condition: Condition,
): number {
  if (condition === "incomplete") return 25;
  if (era === "retiringSoon" && condition === "sealed") return 75;
  if (
    era !== "active" &&
    era !== "retiringSoon" &&
    condition === "sealed"
  ) {
    return 85;
  }
  if (
    era !== "active" &&
    era !== "retiringSoon" &&
    condition === "complete"
  ) {
    return 70;
  }
  if (era === "active" && condition === "sealed") return 50;
  return 40;
}

function scoreRarity(era: RetirementEra, set: Analysis["set"]): number {
  switch (era) {
    case "retiredPre2015":
      return 95;
    case "retired2015to2019":
      return 80;
    case "retired2020plus":
      return set.year <= 2022 ? 65 : 60;
    case "retiringSoon":
      return 55;
    default:
      return 20;
  }
}

function scoreRetirementStrength(
  era: RetirementEra,
  setNumber: string,
): number {
  if (era === "retiredPre2015") return 95;
  if (era === "retired2015to2019") return 85;
  if (era === "retired2020plus") return 75;
  if (era === "retiringSoon") {
    const tier = getTierForSetNumber(setNumber);
    if (tier === "imminent") return 80;
    if (tier === "soon") return 65;
    if (tier === "upcoming") return 50;
    return 60;
  }
  return 15;
}

function scoreGrowthMomentum(
  set: Analysis["set"],
  era: RetirementEra,
  recommendation: Recommendation,
): number {
  const retired = era !== "active" && era !== "retiringSoon";
  const ucsOrModular = isUcsTheme(set.theme) || isModular(set.theme);

  if (recommendation === "SELL" && retired && ucsOrModular) return 85;
  if (recommendation === "SELL" && retired) return 70;
  if (recommendation === "SELL" && era === "active") return 45;
  if (recommendation === "HOLD" && era === "retiringSoon") return 80;
  if (recommendation === "HOLD" && retired) return 60;
  if (recommendation === "HOLD" && isUcsTheme(set.theme) && era === "active") {
    return 55;
  }
  if (recommendation === "HOLD" && era === "active") return 30;
  return 40;
}

export function buildRadarMetrics(data: ComparedSetData): RadarMetrics {
  const { analysis, confidenceScore, opportunity } = data;
  const era = getRetirementEra(analysis.set);

  return {
    roiPotential: scoreRoiPotential(era, opportunity),
    demand: scoreDemand(analysis.set, era),
    liquidity: scoreLiquidity(
      analysis.estimatedValue,
      analysis.recommendation,
    ),
    risk: scoreRisk(era, analysis.condition as Condition),
    rarity: scoreRarity(era, analysis.set),
    retirementStrength: scoreRetirementStrength(
      era,
      analysis.set.number,
    ),
    growthMomentum: scoreGrowthMomentum(
      analysis.set,
      era,
      analysis.recommendation,
    ),
    confidence: clampScore(confidenceScore),
  };
}

export function buildRadarChartProps(
  dataA: ComparedSetData,
  dataB: ComparedSetData,
) {
  const metricsA = buildRadarMetrics(dataA);
  const metricsB = buildRadarMetrics(dataB);
  return {
    setA: {
      name: dataA.analysis.set.name,
      metrics: metricsA as Record<string, number>,
    },
    setB: {
      name: dataB.analysis.set.name,
      metrics: metricsB as Record<string, number>,
    },
    metricsA,
    metricsB,
  };
}

function metricWinner(
  a: number,
  b: number,
): "a" | "b" | "tie" {
  if (Math.abs(a - b) < 2) return "tie";
  return a > b ? "a" : "b";
}

export function buildRadarInsights(
  nameA: string,
  metricsA: RadarMetrics,
  nameB: string,
  metricsB: RadarMetrics,
): string[] {
  let bestA = RADAR_METRIC_DEFS[0];
  let bestAScore = metricsA[bestA.key];
  let bestB = RADAR_METRIC_DEFS[0];
  let bestBScore = metricsB[bestB.key];

  for (const def of RADAR_METRIC_DEFS) {
    if (metricsA[def.key] > bestAScore) {
      bestA = def;
      bestAScore = metricsA[def.key];
    }
    if (metricsB[def.key] > bestBScore) {
      bestB = def;
      bestBScore = metricsB[def.key];
    }
  }

  const strengthInsight =
    bestA.key === bestB.key
      ? `Both sets peak on ${bestA.fullName} — ${nameA} ${bestAScore}, ${nameB} ${bestBScore}.`
      : `${nameA} leads on ${bestA.fullName} (${bestAScore} vs ${metricsB[bestA.key]}); ${nameB} on ${bestB.fullName} (${bestBScore} vs ${metricsA[bestB.key]}).`;

  let maxGap = 0;
  let gapDef = RADAR_METRIC_DEFS[0];
  let gapLeader: "a" | "b" = "a";
  for (const def of RADAR_METRIC_DEFS) {
    const gap = Math.abs(metricsA[def.key] - metricsB[def.key]);
    if (gap > maxGap) {
      maxGap = gap;
      gapDef = def;
      gapLeader = metricsA[def.key] >= metricsB[def.key] ? "a" : "b";
    }
  }

  const gapLeaderName = gapLeader === "a" ? nameA : nameB;
  const gapLeaderScore =
    gapLeader === "a" ? metricsA[gapDef.key] : metricsB[gapDef.key];
  const gapOtherScore =
    gapLeader === "a" ? metricsB[gapDef.key] : metricsA[gapDef.key];
  const gapInsight = `${gapLeaderName} has significantly better ${gapDef.fullName} (${gapLeaderScore} vs ${gapOtherScore})`;

  const valuesA = RADAR_METRIC_KEYS.map((k) => metricsA[k]);
  const valuesB = RADAR_METRIC_KEYS.map((k) => metricsB[k]);
  const rangeA = Math.max(...valuesA) - Math.min(...valuesA);
  const rangeB = Math.max(...valuesB) - Math.min(...valuesB);

  let shapeInsight: string;
  if (rangeA < 30 && rangeB < 30) {
    shapeInsight =
      "Both sets are relatively balanced — low variance across all metrics.";
  } else if (rangeA > rangeB + 10) {
    const peaks = RADAR_METRIC_DEFS.filter((d) => metricsA[d.key] >= 70)
      .map((d) => d.fullName)
      .slice(0, 2);
    shapeInsight = `${nameA} has a more aggressive investor profile — higher ${peaks.length ? peaks.join(" and ") : "ROI and retirement"} scores.`;
  } else if (rangeB > rangeA + 10) {
    const peaks = RADAR_METRIC_DEFS.filter((d) => metricsB[d.key] >= 70)
      .map((d) => d.fullName)
      .slice(0, 2);
    shapeInsight = `${nameB} has a more aggressive investor profile — higher ${peaks.length ? peaks.join(" and ") : "ROI and retirement"} scores.`;
  } else {
    const balancedName = rangeA <= rangeB ? nameA : nameB;
    shapeInsight = `${balancedName} is more balanced — lower variance across all metrics.`;
  }

  return [strengthInsight, gapInsight, shapeInsight];
}

export { metricWinner };
