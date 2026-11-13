import { setDataFromLegoSet, type SetData } from "@/lib/confidence";
import { fetchSetAnalysis } from "@/lib/set-analysis-client";
import {
  currentRecommendationOf,
  savePortfolio,
  syncItemTotals,
  type PortfolioItem,
} from "@/lib/portfolio";
import { opportunitySetFromLego } from "@/lib/opportunityScoring";
import type { OpportunitySetData } from "@/lib/opportunityScoring";

export function catalogueLegoFieldsFromPortfolioItem(item: PortfolioItem): {
  number: string;
  theme: string;
  pieces: number;
  retired?: boolean;
  retiringSoon?: boolean;
} {
  return {
    number: item.setNumber,
    theme: item.theme,
    pieces: item.pieces ?? 0,
    retired: item.retired,
    retiringSoon: item.retiringSoon,
  };
}

export function setDataFromPortfolioItem(item: PortfolioItem): SetData {
  const fields = catalogueLegoFieldsFromPortfolioItem(item);
  return setDataFromLegoSet(
    fields,
    currentRecommendationOf(item),
    item.estimatedValue / 1.55,
  );
}

export function opportunitySetFromPortfolioItem(
  item: PortfolioItem,
): OpportunitySetData {
  const fields = catalogueLegoFieldsFromPortfolioItem(item);
  return opportunitySetFromLego(
    fields,
    currentRecommendationOf(item),
    item.estimatedValue / 1.55,
  );
}

/** Refresh value, list price, retirement and recommendation from the current catalogue. */
export async function enrichPortfolioItemsFromCatalogue(
  items: PortfolioItem[],
): Promise<PortfolioItem[]> {
  const enriched = await Promise.all(
    items.map(async (item) => {
      // Same condition the set list uses for its recommendation
      const primary = item.copies[0]?.condition ?? item.condition;
      const conditions = [
        ...new Set([primary, ...item.copies.map((c) => c.condition)]),
      ];
      const analyses = await Promise.all(
        conditions.map((c) => fetchSetAnalysis(item.setNumber, c)),
      );
      const analysis = analyses[0];
      if (!analysis) return syncItemTotals(item);

      const valueByCondition: PortfolioItem["valueByCondition"] = {};
      conditions.forEach((c, i) => {
        const a = analyses[i];
        if (a) valueByCondition[c] = a.estimatedValue;
      });

      const { set } = analysis;
      return syncItemTotals({
        ...item,
        theme: item.theme || set.theme,
        pieces: item.pieces && item.pieces > 0 ? item.pieces : set.pieces,
        retired: set.retired === true,
        retiringSoon: set.retiringSoon === true && set.retired !== true,
        estimatedValue: analysis.estimatedValue,
        suggestedListPrice: analysis.recommendedListPrice,
        currentRecommendation: analysis.recommendation,
        valueByCondition,
      });
    }),
  );

  return enriched;
}

export function portfolioItemsChanged(
  before: PortfolioItem[],
  after: PortfolioItem[],
): boolean {
  if (before.length !== after.length) return true;
  return before.some((item, index) => {
    const next = after[index];
    return (
      item.setNumber !== next.setNumber ||
      item.pieces !== next.pieces ||
      item.retired !== next.retired ||
      item.retiringSoon !== next.retiringSoon ||
      item.theme !== next.theme ||
      item.estimatedValue !== next.estimatedValue ||
      item.suggestedListPrice !== next.suggestedListPrice ||
      item.currentRecommendation !== next.currentRecommendation ||
      item.totalEstimatedValue !== next.totalEstimatedValue
    );
  });
}

export async function enrichAndSavePortfolio(
  items: PortfolioItem[],
): Promise<PortfolioItem[]> {
  const enriched = await enrichPortfolioItemsFromCatalogue(items);
  if (portfolioItemsChanged(items, enriched)) {
    savePortfolio(enriched);
  }
  return enriched;
}
