import type { Condition } from "@/lib/analyze";

export const RECENT_COMPARISONS_KEY = "lego-recent-comparisons";
const MAX_RECENT = 5;

export type RecentComparison = {
  setA: string;
  setB: string;
  condA: Condition;
  condB: Condition;
  label: string;
  timestamp: number;
};

export function loadRecentComparisons(): RecentComparison[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_COMPARISONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentComparison[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentComparison(entry: Omit<RecentComparison, "timestamp">) {
  const normalized: RecentComparison = {
    ...entry,
    timestamp: Date.now(),
  };
  const key = `${normalized.setA}|${normalized.setB}|${normalized.condA}|${normalized.condB}`;
  const existing = loadRecentComparisons().filter(
    (r) =>
      `${r.setA}|${r.setB}|${r.condA}|${r.condB}` !== key &&
      `${r.setB}|${r.setA}|${r.condB}|${r.condA}` !== key,
  );
  const next = [normalized, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_COMPARISONS_KEY, JSON.stringify(next));
  return next;
}
