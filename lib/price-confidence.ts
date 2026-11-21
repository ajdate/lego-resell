import type { LegoSet } from "@/lib/analyze-types";

/** Fewer sales than this and an average isn't trustworthy. */
export const MIN_SALES_FOR_PRICE = 3;

/** Sets this old are mostly traded used, so value them as used by default. */
export function isVintageSet(set: LegoSet): boolean {
  return set.year > 0 && set.year <= new Date().getFullYear() - 20;
}

/**
 * True when the catalogue value comes from real sales: the BrickLink
 * backfill, or the original hand-researched sets. Everything else is the
 * old piece-count/retail estimate and shouldn't be shown as a market price.
 */
export function hasVerifiedPrice(set: LegoSet): boolean {
  if (set.priceSource?.startsWith("BrickLink sold")) return true;
  return !set.dataSource || set.dataSource.startsWith("Manual");
}
