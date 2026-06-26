import type { Recommendation } from "@/lib/analyze-types";

export const WATCHLIST_KEY = "lego-watchlist";
export const LAST_SEEN_RECOMMENDATIONS_KEY = "lego-last-seen-recommendations";

export type RecommendationMap = Record<string, Recommendation>;

export interface WatchlistItem {
  setNumber: string;
  name: string;
  theme: string;
  recommendation: Recommendation;
  recommendationAtAdd: Recommendation;
  estimatedValue: number;
  dateAdded: string;
  /** Snapshot when added — for "retired since you added" */
  retiredAtAdd?: boolean;
  retiringSoonAtAdd?: boolean;
}

export interface RecommendationChange {
  setNumber: string;
  name: string;
  old: Recommendation;
  new: Recommendation;
}

export function loadWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(items: WatchlistItem[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

export function isOnWatchlist(items: WatchlistItem[], setNumber: string): boolean {
  const normalized = setNumber.trim();
  return items.some((item) => item.setNumber === normalized);
}

export function addToWatchlist(item: WatchlistItem): WatchlistItem[] {
  const items = loadWatchlist();
  const normalized = item.setNumber.trim();
  const filtered = items.filter((i) => i.setNumber !== normalized);
  const next = [...filtered, { ...item, setNumber: normalized }];
  saveWatchlist(next);
  return next;
}

export function removeFromWatchlist(setNumber: string): WatchlistItem[] {
  const normalized = setNumber.trim();
  const next = loadWatchlist().filter((i) => i.setNumber !== normalized);
  saveWatchlist(next);
  return next;
}

export function loadLastSeenRecommendations(): RecommendationMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAST_SEEN_RECOMMENDATIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RecommendationMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLastSeenRecommendations(map: RecommendationMap): void {
  localStorage.setItem(LAST_SEEN_RECOMMENDATIONS_KEY, JSON.stringify(map));
}

export function detectRecommendationChanges(
  watchlist: WatchlistItem[],
  lastSeen: RecommendationMap,
  current: RecommendationMap,
): RecommendationChange[] {
  const changes: RecommendationChange[] = [];

  for (const item of watchlist) {
    const prev = lastSeen[item.setNumber];
    const now = current[item.setNumber];
    if (prev === undefined || now === undefined || prev === now) continue;
    changes.push({
      setNumber: item.setNumber,
      name: item.name,
      old: prev,
      new: now,
    });
  }

  return changes;
}
