import "server-only";

import {
  analyzeSet,
  getAllSets,
  type LegoSet,
} from "@/lib/analyze.server";
import {
  opportunitySetFromLego,
  scoreOpportunity,
} from "@/lib/opportunityScoring";

import type { MarketOpportunityEntry } from "@/lib/market-opportunities";
import { hasVerifiedPrice } from "@/lib/price-confidence";

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

/** Only sets with real sales data — a score built on an estimate isn't an opportunity. */
export function getAllMarketOpportunities(): MarketOpportunityEntry[] {
  return getAllSets()
    .filter(hasVerifiedPrice)
    .map((set) => {
      try {
        return buildMarketOpportunityEntry(set);
      } catch {
        return null;
      }
    })
    .filter((e): e is MarketOpportunityEntry => e !== null)
    .sort(
      (a, b) =>
        b.opportunity.opportunityScore - a.opportunity.opportunityScore,
    );
}
