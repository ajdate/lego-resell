export const SUGGESTED_SETS_KEY = "lego-suggested-sets";

export interface SuggestedSetEntry {
  setNumber: string;
  notes: string;
  date: string;
}

export function loadSuggestedSets(): SuggestedSetEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUGGESTED_SETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SuggestedSetEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSuggestedSet(entry: SuggestedSetEntry): void {
  const existing = loadSuggestedSets();
  existing.push(entry);
  localStorage.setItem(SUGGESTED_SETS_KEY, JSON.stringify(existing));
}
