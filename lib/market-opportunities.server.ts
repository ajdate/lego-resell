import "server-only";

import {
  analyzeSet,
  getAllSets,
  type Analysis,
  type LegoSet,
} from "@/lib/analyze.server";
import {
  opportunitySetFromLego,
  scoreOpportunity,
  type OpportunityScoreResult,
} from "@/lib/opportunityScoring";

import type { MarketOpportunityEntry } from "@/lib/market-opportunities";

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
