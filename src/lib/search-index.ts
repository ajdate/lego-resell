import setsData from "@/data/sets.json";

type RawSet = {
  number?: string;
  setNumber?: string;
  name?: string;
  theme?: string;
  year?: number;
  retired?: boolean;
};

const rawSets: RawSet[] = Array.isArray(setsData)
  ? setsData
  : (setsData as { sets: RawSet[] }).sets;

export interface SearchIndexEntry {
  setNumber: string;
  name: string;
  theme: string;
  year: number;
  retired?: boolean;
}

// Lightweight index — only fields needed for search autocomplete
export const searchIndex: SearchIndexEntry[] = rawSets
  .map((s) => ({
    setNumber: String(s.setNumber ?? s.number ?? ""),
    name: s.name ?? "",
    theme: s.theme ?? "",
    year: s.year ?? 0,
    retired: s.retired,
  }))
  .filter((s) => s.setNumber.length > 0);

export function searchSets(query: string, limit = 20): SearchIndexEntry[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return searchIndex
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
  return searchIndex.filter((s) => s.theme === normalized);
}
