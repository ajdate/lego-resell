import type { Recommendation } from "@/lib/analyze";

export const RECOMMENDATION_HISTORY_KEY = "lego-recommendation-history";

export interface RecommendationHistoryEntry {
  setNumber: string;
  recommendation: Recommendation;
  confidenceScore: number;
  date: string;
}

type HistoryStore = Record<string, RecommendationHistoryEntry>;

export function loadRecommendationHistory(): HistoryStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RECOMMENDATION_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HistoryStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRecommendationHistory(store: HistoryStore): void {
  localStorage.setItem(RECOMMENDATION_HISTORY_KEY, JSON.stringify(store));
}

export function getPreviousView(
  setNumber: string,
): RecommendationHistoryEntry | undefined {
  const normalized = setNumber.trim();
  return loadRecommendationHistory()[normalized];
}

export function recordRecommendationView(
  entry: RecommendationHistoryEntry,
): RecommendationHistoryEntry | undefined {
  const normalized = entry.setNumber.trim();
  const store = loadRecommendationHistory();
  const previous = store[normalized];
  store[normalized] = { ...entry, setNumber: normalized };
  saveRecommendationHistory(store);
  return previous;
}

export function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
