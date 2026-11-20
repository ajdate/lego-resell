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

/** Lower is better; null = no match. */
function matchRank(s: SearchIndexEntry, q: string, qBase: string): number | null {
  const num = s.setNumber.toLowerCase();
  const name = s.name.toLowerCase();
  // Exact set, or another set sharing the number ("112" → 112 and 112-2)
  if (num === q || num === qBase || num.startsWith(`${qBase}-`)) return 0;
  if (num.startsWith(q)) return 1;
  if (name === q) return 2;
  if (name.startsWith(q)) return 3;
  if (name.includes(q)) return 4;
  if (num.includes(q)) return 5;
  if (s.theme.toLowerCase().includes(q)) return 6;
  return null;
}

export function searchIndexMatches(
  query: string,
  limit = 20,
): SearchIndexEntry[] {
  const q = query.trim().toLowerCase();
  // Single characters are too broad, except a set number like "8"
  if (!q || (q.length < 2 && !/^\d$/.test(q))) return [];
  const qBase = q.replace(/-1$/, ""); // "112-1" is stored as "112"
  return getSearchIndex()
    .map((s) => ({ s, rank: matchRank(s, q, qBase) }))
    .filter((m): m is { s: SearchIndexEntry; rank: number } => m.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.s.year - b.s.year)
    .slice(0, limit)
    .map((m) => m.s);
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
