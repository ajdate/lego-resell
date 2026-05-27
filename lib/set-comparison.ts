import {
  analyzeSet,
  isSetRetired,
  isSetRetiringSoon,
  type Analysis,
  type Condition,
  type Recommendation,
} from "@/lib/analyze";
import { calculateConfidence, setDataFromLegoSet } from "@/lib/confidence";
import {
  explanationSetFromLegoSet,
  generateExplanation,
  type DemandRating,
  type LiquidityRating,
  type RiskRating,
  type ScarcityRating,
} from "@/lib/explanations";
import {
  opportunitySetFromLego,
  scoreOpportunity,
  type OpportunityScoreResult,
} from "@/lib/opportunityScoring";
import type { ConfidenceFactor } from "@/lib/confidence";
import { compareFactorAdvantages, toScoreFactors } from "@/lib/score-utils";

export type CompareSide = "a" | "b" | "tie";

export type ComparedSetData = {
  analysis: Analysis;
  confidenceScore: number;
  confidenceFactors: ConfidenceFactor[];
  opportunity: OpportunityScoreResult;
  scarcityRating: ScarcityRating;
  demandRating: DemandRating;
  liquidityRating: LiquidityRating;
  riskRating: RiskRating;
  retired: boolean;
  retiringSoon: boolean;
};

export type ComparisonMetricRow = {
  id: string;
  label: string;
  valueA: string;
  valueB: string;
  rawA?: number;
  rawB?: number;
  winner: CompareSide;
  vsIndicator: "→" | "←" | "=";
};

const SCARCITY_RANK: Record<ScarcityRating, number> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  "Very Rare": 4,
};

const DEMAND_RANK: Record<DemandRating, number> = {
  Low: 1,
  Moderate: 2,
  High: 3,
  "Very High": 4,
};

const LIQUIDITY_RANK: Record<LiquidityRating, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const RISK_RANK: Record<RiskRating, number> = {
  "High Risk": 3,
  "Medium Risk": 2,
  "Low Risk": 1,
};

function compareHigher(a: number, b: number, tolerance = 0.5): CompareSide {
  if (Math.abs(a - b) <= tolerance) return "tie";
  return a > b ? "a" : "b";
}

function compareLower(a: number, b: number): CompareSide {
  if (a === b) return "tie";
  return a < b ? "a" : "b";
}

function vsFromWinner(winner: CompareSide): "→" | "←" | "=" {
  if (winner === "a") return "→";
  if (winner === "b") return "←";
  return "=";
}

function riskLabelShort(r: RiskRating): string {
  if (r === "Low Risk") return "Low";
  if (r === "High Risk") return "High";
  return "Medium";
}

export function buildComparedSet(
  setNumber: string,
  condition: Condition,
): ComparedSetData | null {
  const analysis = analyzeSet(setNumber, condition);
  if (!analysis) return null;

  const setData = setDataFromLegoSet(
    analysis.set,
    analysis.recommendation,
    analysis.estimatedValue,
  );
  const confidence = calculateConfidence(setData, condition);
  const explanation = generateExplanation(
    explanationSetFromLegoSet(
      analysis.set,
      analysis.recommendation,
      analysis.estimatedValue,
    ),
    condition,
    confidence.score,
  );
  const opportunity = scoreOpportunity(
    opportunitySetFromLego(
      analysis.set,
      analysis.recommendation,
      analysis.estimatedValue,
    ),
  );

  return {
    analysis,
    confidenceScore: confidence.score,
    confidenceFactors: confidence.factors,
    opportunity,
    scarcityRating: explanation.scarcityRating,
    demandRating: explanation.demandRating,
    liquidityRating: explanation.liquidityRating,
    riskRating: explanation.riskRating,
    retired: isSetRetired(analysis.set),
    retiringSoon: isSetRetiringSoon(analysis.set),
  };
}

export function overallComparisonScore(data: ComparedSetData): number {
  return (
    data.confidenceScore +
    data.opportunity.opportunityScore +
    data.opportunity.projectedROI12m
  );
}

export function buildMetricRows(
  a: ComparedSetData,
  b: ComparedSetData,
  formatPrice: (aud: number) => string,
): ComparisonMetricRow[] {
  const rows: ComparisonMetricRow[] = [];

  const addNumeric = (
    id: string,
    label: string,
    rawA: number,
    rawB: number,
    format: (n: number) => string = String,
    higherWins = true,
  ) => {
    const winner = higherWins
      ? compareHigher(rawA, rawB)
      : compareLower(rawA, rawB);
    rows.push({
      id,
      label,
      valueA: format(rawA),
      valueB: format(rawB),
      rawA,
      rawB,
      winner,
      vsIndicator: vsFromWinner(winner),
    });
  };

  addNumeric(
    "estimatedValue",
    "Estimated Value",
    a.analysis.estimatedValue,
    b.analysis.estimatedValue,
    formatPrice,
  );
  addNumeric(
    "listPrice",
    "Suggested List Price",
    a.analysis.recommendedListPrice,
    b.analysis.recommendedListPrice,
    formatPrice,
  );

  const recWinner = recommendationWinner(
    a.analysis.recommendation,
    b.analysis.recommendation,
  );
  rows.push({
    id: "recommendation",
    label: "Recommendation",
    valueA: a.analysis.recommendation,
    valueB: b.analysis.recommendation,
    winner: recWinner,
    vsIndicator: vsFromWinner(recWinner),
  });

  addNumeric(
    "confidence",
    "Confidence Score",
    a.confidenceScore,
    b.confidenceScore,
    (n) => `${Math.round(n)}/100`,
  );
  addNumeric(
    "opportunity",
    "Opportunity Score",
    a.opportunity.opportunityScore,
    b.opportunity.opportunityScore,
    (n) => `${Math.round(n)}/100`,
  );
  addNumeric(
    "roi12m",
    "ROI Potential (12m)",
    a.opportunity.projectedROI12m,
    b.opportunity.projectedROI12m,
    (n) => `${Math.round(n)}%`,
  );

  const addOrdinal = (
    id: string,
    label: string,
    rankA: number,
    rankB: number,
    displayA: string,
    displayB: string,
    higherWins = true,
  ) => {
    const winner = higherWins
      ? compareHigher(rankA, rankB, 0)
      : compareLower(rankA, rankB);
    rows.push({
      id,
      label,
      valueA: displayA,
      valueB: displayB,
      rawA: rankA,
      rawB: rankB,
      winner,
      vsIndicator: vsFromWinner(winner),
    });
  };

  addOrdinal(
    "scarcity",
    "Scarcity Rating",
    SCARCITY_RANK[a.scarcityRating],
    SCARCITY_RANK[b.scarcityRating],
    a.scarcityRating,
    b.scarcityRating,
  );
  addOrdinal(
    "demand",
    "Demand Rating",
    DEMAND_RANK[a.demandRating],
    DEMAND_RANK[b.demandRating],
    a.demandRating,
    b.demandRating,
  );
  addOrdinal(
    "liquidity",
    "Liquidity Rating",
    LIQUIDITY_RANK[a.liquidityRating],
    LIQUIDITY_RANK[b.liquidityRating],
    a.liquidityRating,
    b.liquidityRating,
  );
  addOrdinal(
    "risk",
    "Risk Rating",
    RISK_RANK[a.riskRating],
    RISK_RANK[b.riskRating],
    riskLabelShort(a.riskRating),
    riskLabelShort(b.riskRating),
    false,
  );

  rows.push({
    id: "pieces",
    label: "Piece Count",
    valueA: a.analysis.set.pieces.toLocaleString(),
    valueB: b.analysis.set.pieces.toLocaleString(),
    winner: "tie",
    vsIndicator: "=",
  });
  rows.push({
    id: "year",
    label: "Year Released",
    valueA: String(a.analysis.set.year),
    valueB: String(b.analysis.set.year),
    winner: "tie",
    vsIndicator: "=",
  });

  const retiredWinner =
    a.retired === b.retired
      ? "tie"
      : a.retired
            ? "a"
            : "b";
  rows.push({
    id: "retired",
    label: "Retired Status",
    valueA: a.retired ? "Yes" : "No",
    valueB: b.retired ? "Yes" : "No",
    winner: retiredWinner,
    vsIndicator: vsFromWinner(retiredWinner),
  });

  const retiringWinner =
    a.retiringSoon === b.retiringSoon
      ? "tie"
      : !a.retiringSoon
          ? "a"
          : "b";
  rows.push({
    id: "retiringSoon",
    label: "Retiring Soon",
    valueA: a.retiringSoon ? "Yes" : "No",
    valueB: b.retiringSoon ? "Yes" : "No",
    winner: retiringWinner,
    vsIndicator: vsFromWinner(retiringWinner),
  });

  rows.push({
    id: "theme",
    label: "Theme",
    valueA: a.analysis.set.theme,
    valueB: b.analysis.set.theme,
    winner: "tie",
    vsIndicator: "=",
  });

  return rows;
}

function recommendationWinner(
  a: Recommendation,
  b: Recommendation,
): CompareSide {
  if (a === b) return "tie";
  if (a === "SELL") return "a";
  if (b === "SELL") return "b";
  return "tie";
}

export type ComparisonVerdict = {
  overallWinner: CompareSide;
  winnerName: string | null;
  headline: string;
  insights: string[];
  resalePick: "a" | "b" | "tie";
  holdPick: "a" | "b" | "tie";
  diversificationNote: string;
};

export function buildComparisonVerdict(
  a: ComparedSetData,
  b: ComparedSetData,
): ComparisonVerdict {
  const scoreA = overallComparisonScore(a);
  const scoreB = overallComparisonScore(b);
  const diff = Math.abs(scoreA - scoreB);
  let overallWinner: CompareSide = "tie";
  if (diff > 8) {
    overallWinner = scoreA > scoreB ? "a" : "b";
  }

  const winnerData = overallWinner === "a" ? a : overallWinner === "b" ? b : null;
  const winnerName = winnerData?.analysis.set.name ?? null;

  const headline =
    overallWinner === "tie"
      ? "Too close to call — both sets have strong signals"
      : overallWinner === "a"
        ? `Set A wins — ${a.analysis.set.name}`
        : `Set B wins — ${b.analysis.set.name}`;

  const insights = generateInsights(a, b);

  const resalePick = pickResale(a, b);
  const holdPick = pickHold(a, b);

  const sameTheme = a.analysis.set.theme === b.analysis.set.theme;
  const diversificationNote = sameTheme
    ? `Both sets are ${a.analysis.set.theme} — consider a different theme to reduce concentration risk.`
    : "For portfolio diversification: consider holding both — different themes reduce concentration risk.";

  return {
    overallWinner,
    winnerName,
    headline,
    insights,
    resalePick,
    holdPick,
    diversificationNote,
  };
}

function pickResale(a: ComparedSetData, b: ComparedSetData): "a" | "b" | "tie" {
  if (a.analysis.recommendation === "SELL" && b.analysis.recommendation !== "SELL") {
    return "a";
  }
  if (b.analysis.recommendation === "SELL" && a.analysis.recommendation !== "SELL") {
    return "b";
  }
  if (a.confidenceScore > b.confidenceScore + 5) return "a";
  if (b.confidenceScore > a.confidenceScore + 5) return "b";
  return "tie";
}

function pickHold(a: ComparedSetData, b: ComparedSetData): "a" | "b" | "tie" {
  if (
    a.opportunity.projectedROI12m > b.opportunity.projectedROI12m + 3
  ) {
    return "a";
  }
  if (
    b.opportunity.projectedROI12m > a.opportunity.projectedROI12m + 3
  ) {
    return "b";
  }
  if (a.opportunity.opportunityScore > b.opportunity.opportunityScore + 5) {
    return "a";
  }
  if (b.opportunity.opportunityScore > a.opportunity.opportunityScore + 5) {
    return "b";
  }
  return "tie";
}

function generateInsights(
  a: ComparedSetData,
  b: ComparedSetData,
): string[] {
  const insights: string[] = [];
  const nameA = a.analysis.set.name;
  const nameB = b.analysis.set.name;
  const numA = a.analysis.set.number;
  const numB = b.analysis.set.number;

  if (a.retired !== b.retired) {
    const retired = a.retired ? { name: nameA, num: numA } : { name: nameB, num: numB };
    const active = a.retired
      ? { name: nameB, num: numB }
      : { name: nameA, num: numA };
    insights.push(
      `${retired.num} is retired while ${active.num} is still in production — ${retired.name} carries lower supply risk.`,
    );
  } else if (a.retiringSoon !== b.retiringSoon) {
    const soon = a.retiringSoon ? nameA : nameB;
    const other = a.retiringSoon ? nameB : nameA;
    insights.push(
      `${soon} is flagged retiring soon while ${other} is not — the retiring set may see stronger pre-retirement demand.`,
    );
  }

  if (a.analysis.set.theme !== b.analysis.set.theme) {
    const ucs =
      a.analysis.set.theme.includes("UCS") ||
      b.analysis.set.theme.includes("UCS");
    if (ucs) {
      insights.push(
        "UCS Star Wars sets have historically outperformed many other themes post-retirement — weigh theme momentum in your decision.",
      );
    } else {
      insights.push(
        `${a.analysis.set.theme} and ${b.analysis.set.theme} play to different collector audiences — theme fit matters for your exit strategy.`,
      );
    }
  }

  const oppDiff =
    a.opportunity.opportunityScore - b.opportunity.opportunityScore;
  if (Math.abs(oppDiff) >= 5) {
    const leader = oppDiff > 0 ? { num: numA, name: nameA } : { num: numB, name: nameB };
    insights.push(
      `${leader.num} has a higher opportunity score — stronger buy/hold signal right now for ${leader.name}.`,
    );
  }

  while (insights.length < 3) {
    if (insights.length === 0) {
      insights.push(
        `Both sets show ${a.analysis.recommendation === b.analysis.recommendation ? `a ${a.analysis.recommendation} signal` : "mixed SELL/HOLD signals"} — align your choice with whether you need liquidity now or appreciation later.`,
      );
    } else if (insights.length === 1) {
      insights.push(
        `Confidence scores: ${a.confidenceScore}/100 (${numA}) vs ${b.confidenceScore}/100 (${numB}) — higher confidence supports clearer pricing decisions.`,
      );
    } else {
      insights.push(
        `12-month ROI projections: ${Math.round(a.opportunity.projectedROI12m)}% (${numA}) vs ${Math.round(b.opportunity.projectedROI12m)}% (${numB}).`,
      );
    }
  }

  return insights.slice(0, 3);
}

export function getSetFactorComparison(
  a: ComparedSetData,
  b: ComparedSetData,
) {
  const factorsA = toScoreFactors(a.confidenceFactors);
  const factorsB = toScoreFactors(b.confidenceFactors);
  const { aAdvantages, bAdvantages } = compareFactorAdvantages(
    factorsA,
    factorsB,
    "Set A",
    "Set B",
  );
  const pillsA = [...factorsA]
    .sort((x, y) => Math.abs(y.points) - Math.abs(x.points))
    .slice(0, 3);
  const pillsB = [...factorsB]
    .sort((x, y) => Math.abs(y.points) - Math.abs(x.points))
    .slice(0, 3);
  let scoreInsight = "";
  if (a.confidenceScore > b.confidenceScore + 5) {
    scoreInsight = `Set A scores higher on confidence (${a.confidenceScore} vs ${b.confidenceScore}) — clearer pricing signals for resale.`;
  } else if (b.confidenceScore > a.confidenceScore + 5) {
    scoreInsight = `Set B scores higher on confidence (${b.confidenceScore} vs ${a.confidenceScore}) — clearer pricing signals for resale.`;
  } else {
    scoreInsight =
      "Both sets have similar confidence scores — compare opportunity and condition specifics below.";
  }
  return {
    factorsA,
    factorsB,
    pillsA,
    pillsB,
    aAdvantages,
    bAdvantages,
    scoreInsight,
  };
}

export function sideLabel(
  side: CompareSide,
  tieLabel = "Either set",
): string {
  if (side === "a") return "Set A";
  if (side === "b") return "Set B";
  return tieLabel;
}
