import "server-only";

import type {
  Analysis,
  Condition,
  LegoSet,
  PortfolioCondition,
  Recommendation,
} from "@/lib/analyze-types";
import { DAMAGED_BOX_VALUE_MULTIPLIER } from "@/lib/analyze-types";
import { getCatalogSets } from "@/src/lib/sets-catalog-server";

export function getAllSets(): LegoSet[] {
  return getCatalogSets();
}

export function getRetiringSoonSets(): LegoSet[] {
  return getCatalogSets().filter(
    (s) => s.retiringSoon === true && s.retired !== true,
  );
}

export function findSet(setNumber: string): LegoSet | undefined {
  const normalized = setNumber.trim().replace(/\s+/g, "");
  return getCatalogSets().find(
    (set) =>
      set.number === normalized ||
      set.number === normalized.replace(/^0+/, ""),
  );
}

export function analyzeSet(
  setNumber: string,
  condition: PortfolioCondition,
): Analysis | null {
  const set = findSet(setNumber);
  if (!set) return null;

  if (condition === "damaged-box") {
    const sealed = analyzeSet(setNumber, "sealed");
    if (!sealed) return null;
    const estimatedValue = Math.round(
      sealed.estimatedValue * DAMAGED_BOX_VALUE_MULTIPLIER,
    );
    const recommendedListPrice = Math.round(estimatedValue * 1.08);
    const roiPercent = Math.round(
      ((estimatedValue - set.msrp) / set.msrp) * 100,
    );
    return {
      set,
      condition: "damaged-box",
      estimatedValue,
      recommendedListPrice,
      roiPercent,
      recommendation: sealed.recommendation,
      reasoning: `Damaged box (sealed contents). Valued at ${Math.round(DAMAGED_BOX_VALUE_MULTIPLIER * 100)}% of sealed market price ($${sealed.estimatedValue} sealed). ${sealed.reasoning}`,
    };
  }

  const override = set.analysis?.[condition];
  const pricing = set.pricing[condition];
  const estimatedValue = override?.estimatedValue ?? pricing.estimatedValue;
  const recommendedListPrice =
    override?.recommendedListPrice ?? Math.round(estimatedValue * 1.08);
  const roiPercent = Math.round(
    ((estimatedValue - set.msrp) / set.msrp) * 100,
  );

  if (override) {
    return {
      set,
      condition,
      estimatedValue,
      recommendedListPrice,
      roiPercent,
      recommendation: override.recommendation,
      reasoning: override.reasoning,
    };
  }

  let recommendation: Recommendation;
  let reasoning: string;

  if (pricing.trend === "falling" && roiPercent >= 25) {
    recommendation = "SELL";
    reasoning = `Market prices for ${condition} copies are softening while your set still holds a ${roiPercent}% premium over MSRP. Listing now helps lock in value before further decline.`;
  } else if (pricing.trend === "rising" && roiPercent < 60) {
    recommendation = "HOLD";
    reasoning = `Demand for this set in ${condition} condition is still climbing. With ${roiPercent}% above retail, waiting could capture more upside as collectors compete for stock.`;
  } else if (roiPercent >= 80) {
    recommendation = "SELL";
    reasoning = `At ${roiPercent}% over MSRP, the set is richly valued. Taking profit at $${recommendedListPrice} list price reduces exposure if the market cools.`;
  } else if (pricing.trend === "stable" && roiPercent >= 40) {
    recommendation = "SELL";
    reasoning = `Prices have plateaued at a healthy ${roiPercent}% gain. A listing near $${recommendedListPrice} should attract buyers without waiting for uncertain future growth.`;
  } else {
    recommendation = "HOLD";
    reasoning = `Current ${condition} value sits at $${estimatedValue} (${roiPercent}% over MSRP) with ${pricing.trend} momentum. Holding avoids underselling while the market finds its next price level.`;
  }

  return {
    set,
    condition,
    estimatedValue,
    recommendedListPrice,
    roiPercent,
    recommendation,
    reasoning,
  };
}
