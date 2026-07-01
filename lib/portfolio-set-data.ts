import { setDataFromLegoSet, type SetData } from "@/lib/confidence";
import { fetchSetMeta } from "@/lib/set-analysis-client";
import {
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
    item.recommendation,
    item.estimatedValue / 1.55,
  );
}

export function opportunitySetFromPortfolioItem(
  item: PortfolioItem,
): OpportunitySetData {
  const fields = catalogueLegoFieldsFromPortfolioItem(item);
  return opportunitySetFromLego(
    fields,
    item.recommendation,
    item.estimatedValue / 1.55,
  );
}

function portfolioItemNeedsCatalogueEnrichment(item: PortfolioItem): boolean {
  const missingPieces = !item.pieces || item.pieces <= 0;
  const missingRetirement =
    item.retired === undefined && item.retiringSoon === undefined;
  return missingPieces || missingRetirement;
}

export function mergePortfolioItemWithCatalogue(
  item: PortfolioItem,
  meta: {
    theme: string;
    pieces: number;
    retired?: boolean;
    retiringSoon?: boolean;
  },
): PortfolioItem {
  return syncItemTotals({
    ...item,
    theme: item.theme || meta.theme,
    pieces: item.pieces && item.pieces > 0 ? item.pieces : meta.pieces,
    retired: item.retired ?? meta.retired ?? false,
    retiringSoon:
      item.retiringSoon ??
      (meta.retiringSoon === true && meta.retired !== true),
  });
}

export async function enrichPortfolioItemsFromCatalogue(
  items: PortfolioItem[],
): Promise<PortfolioItem[]> {
  const enriched = await Promise.all(
    items.map(async (item) => {
      if (!portfolioItemNeedsCatalogueEnrichment(item)) {
        return syncItemTotals(item);
      }

      const meta = await fetchSetMeta(item.setNumber);
      if (!meta) return syncItemTotals(item);

      return mergePortfolioItemWithCatalogue(item, meta);
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
      item.theme !== next.theme
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
