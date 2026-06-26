import "server-only";

import { analyzeSet, findSet, type LegoSet, type Recommendation } from "@/lib/analyze.server";
import {
  getSearchIndexByTheme,
  searchIndexMatches,
} from "@/src/lib/search-index.server";

export interface SetSearchResult {
  number: string;
  name: string;
  theme: string;
  year: number;
  pieces: number;
  msrp: number;
  retired: boolean;
  retiringSoon: boolean;
  estimatedValue: number;
  recommendedListPrice: number;
  recommendation: Recommendation;
}

export function toSearchResult(set: LegoSet): SetSearchResult | null {
  const analysis = analyzeSet(set.number, "sealed");
  if (!analysis) return null;

  return {
    number: set.number,
    name: set.name,
    theme: set.theme,
    year: set.year,
    pieces: set.pieces,
    msrp: set.msrp,
    retired: set.retired === true,
    retiringSoon: set.retiringSoon === true && set.retired !== true,
    estimatedValue: analysis.estimatedValue,
    recommendedListPrice: analysis.recommendedListPrice,
    recommendation: analysis.recommendation,
  };
}

export function searchSets(query: string, limit = 20): SetSearchResult[] {
  const q = query.trim();
  if (!q) return [];

  return searchIndexMatches(q, Math.max(limit, 20))
    .map((entry) => {
      const set = findSet(entry.setNumber);
      return set ? toSearchResult(set) : null;
    })
    .filter((r): r is SetSearchResult => r !== null)
    .slice(0, limit);
}

export function getSetsByTheme(theme: string): SetSearchResult[] {
  return getSearchIndexByTheme(theme.trim())
    .map((entry) => {
      const set = findSet(entry.setNumber);
      return set ? toSearchResult(set) : null;
    })
    .filter((r): r is SetSearchResult => r !== null);
}
