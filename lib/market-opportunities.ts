import type { Analysis, LegoSet } from "@/lib/analyze-types";
import type { OpportunityScoreResult } from "@/lib/opportunityScoring";

export interface MarketOpportunityEntry {
  set: LegoSet;
  analysis: Analysis;
  opportunity: OpportunityScoreResult;
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
