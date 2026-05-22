import {
  getConfidenceBand,
  getConfidenceBandLabel,
  type ConfidenceBand,
} from "@/lib/confidence";

export const WATCHLIST_CONFIDENCE_KEY = "lego-watchlist-confidence-scores";

export interface StoredWatchlistConfidence {
  score: number;
  label: string;
  band: ConfidenceBand;
}

export function loadWatchlistConfidenceScores(): Record<
  string,
  StoredWatchlistConfidence
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WATCHLIST_CONFIDENCE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredWatchlistConfidence>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveWatchlistConfidenceScores(
  scores: Record<string, StoredWatchlistConfidence>,
): void {
  localStorage.setItem(WATCHLIST_CONFIDENCE_KEY, JSON.stringify(scores));
}

export function storeWatchlistConfidence(
  setNumber: string,
  score: number,
  label: string,
): void {
  const scores = loadWatchlistConfidenceScores();
  scores[setNumber] = {
    score,
    label,
    band: getConfidenceBand(score),
  };
  saveWatchlistConfidenceScores(scores);
}

export function getConfidenceChangeMessage(
  previous: StoredWatchlistConfidence | undefined,
  currentScore: number,
  currentLabel: string,
): string | null {
  if (!previous) return null;
  const currentBand = getConfidenceBand(currentScore);
  if (currentBand === previous.band) return null;
  return `⚠️ Confidence changed — was ${getConfidenceBandLabel(previous.band)}, now ${getConfidenceBandLabel(currentBand)}`;
}
