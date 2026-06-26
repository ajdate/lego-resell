import "server-only";

import { analyzeSet, findSet } from "@/lib/analyze.server";
import {
  calculateConfidence,
  setDataFromLegoSet,
} from "@/lib/confidence";
import {
  calculateOpportunityScore,
  getHistoricalInsight,
  getOpportunityLabel,
  getPostRetirementRange,
  getTierForSetNumber,
  RETIRING_TIER_CONFIG,
  TIER_ORDER,
  type RetiringSoonEntry,
} from "@/lib/retiring-soon";

export function buildRetiringSoonEntry(
  setNumber: string,
): RetiringSoonEntry | null {
  const tier = getTierForSetNumber(setNumber);
  if (!tier) return null;

  const set = findSet(setNumber);
  if (!set || set.retired) return null;

  const analysis = analyzeSet(setNumber, "sealed");
  if (!analysis) return null;

  const tierConfig = RETIRING_TIER_CONFIG[tier];
  const opportunityScore = calculateOpportunityScore(
    tier,
    set,
    analysis.estimatedValue,
    analysis.recommendation,
  );

  return {
    set,
    analysis,
    tier,
    tierConfig,
    confidence: calculateConfidence(
      setDataFromLegoSet(
        set,
        analysis.recommendation,
        analysis.estimatedValue,
      ),
      "sealed",
    ),
    opportunityScore,
    opportunityLabel: getOpportunityLabel(opportunityScore),
    postRetirement: getPostRetirementRange(analysis.estimatedValue),
    historicalInsight: getHistoricalInsight(set.theme),
  };
}

export function getAllRetiringSoonEntries(): RetiringSoonEntry[] {
  const entries: RetiringSoonEntry[] = [];
  for (const tier of TIER_ORDER) {
    for (const setNumber of RETIRING_TIER_CONFIG[tier].setNumbers) {
      const entry = buildRetiringSoonEntry(setNumber);
      if (entry) entries.push(entry);
    }
  }
  return entries;
}
