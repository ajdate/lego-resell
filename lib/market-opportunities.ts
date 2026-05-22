import {
  analyzeSet,
  getAllSets,
  type Analysis,
  type LegoSet,
} from "@/lib/analyze";
import {
  opportunitySetFromLego,
  scoreOpportunity,
  type OpportunityScoreResult,
} from "@/lib/opportunityScoring";

export interface MarketOpportunityEntry {
  set: LegoSet;
  analysis: Analysis;
  opportunity: OpportunityScoreResult;
}

export function buildMarketOpportunityEntry(
  set: LegoSet,
  condition: "sealed" | "complete" | "incomplete" = "sealed",
): MarketOpportunityEntry | null {
  const analysis = analyzeSet(set.number, condition);
  if (!analysis) return null;

  const opportunity = scoreOpportunity(
    opportunitySetFromLego(
      set,
      analysis.recommendation,
      analysis.estimatedValue,
    ),
  );

  return { set, analysis, opportunity };
}

export function getAllMarketOpportunities(): MarketOpportunityEntry[] {
  return getAllSets()
    .map((set) => buildMarketOpportunityEntry(set))
    .filter((e): e is MarketOpportunityEntry => e !== null)
    .sort(
      (a, b) =>
        b.opportunity.opportunityScore - a.opportunity.opportunityScore,
    );
}

export function getOpportunitiesSummary(entries: MarketOpportunityEntry[]) {
  const total = entries.length;
  const strongBuyCount = entries.filter(
    (e) =>
      e.opportunity.buySignal === "Strong Buy" ||
      e.opportunity.buySignal === "Buy",
  ).length;
  const top = entries[0] ?? null;
  const avgRoi12m =
    total > 0
      ? Math.round(
          entries.reduce((sum, e) => sum + e.opportunity.projectedROI12m, 0) /
            total,
        )
      : 0;
  return { total, strongBuyCount, top, avgRoi12m };
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
