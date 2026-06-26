import "server-only";

import { getCatalogSets } from "@/src/lib/sets-catalog-server";

export interface SearchIndexEntry {
  setNumber: string;
  name: string;
  theme: string;
  year: number;
  retired?: boolean;
}

let searchIndexCache: SearchIndexEntry[] | null = null;

function getSearchIndex(): SearchIndexEntry[] {
  if (!searchIndexCache) {
    searchIndexCache = getCatalogSets().map((s) => ({
      setNumber: s.number,
      name: s.name,
      theme: s.theme,
      year: s.year,
      retired: s.retired,
    }));
  }
  return searchIndexCache;
}

export function searchIndexMatches(
  query: string,
  limit = 20,
): SearchIndexEntry[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return getSearchIndex()
    .filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.setNumber.toLowerCase().includes(q) ||
        s.theme.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export function getSearchIndexByTheme(theme: string): SearchIndexEntry[] {
  const normalized = theme.trim();
  return getSearchIndex().filter((s) => s.theme === normalized);
}

export function getThemeCountsFromIndex(
  themes: string[],
): Record<string, number> {
  const index = getSearchIndex();
  const counts: Record<string, number> = {};
  for (const theme of themes) {
    counts[theme] = index.filter((s) => s.theme === theme).length;
  }
  return counts;
}
