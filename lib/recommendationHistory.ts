import type { Condition, Recommendation } from "@/lib/analyze";
import type { SetData } from "@/lib/confidence";

export const HISTORY_KEY_PREFIX = "lego-rec-history-";
const MAX_SNAPSHOTS = 20;
const CONFIDENCE_SAVE_THRESHOLD = 5;

export interface RecommendationSnapshot {
  date: string;
  recommendation: Recommendation;
  confidenceScore: number;
  estimatedValue: number;
  condition: string;
  conditionMultiplier: number;
}

export interface RecommendationChange {
  date: string;
  from: Recommendation;
  to: Recommendation;
  confidenceFrom: number;
  confidenceTo: number;
  valueTo: number;
}

export type RecommendationTrend = "improving" | "declining" | "stable";

function historyKey(setNumber: string): string {
  return `${HISTORY_KEY_PREFIX}${setNumber.trim()}`;
}

function loadRawSnapshots(setNumber: string): RecommendationSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey(setNumber));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecommendationSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRawSnapshots(
  setNumber: string,
  snapshots: RecommendationSnapshot[],
): void {
  localStorage.setItem(historyKey(setNumber), JSON.stringify(snapshots));
}

export function formatHistoryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function saveRecommendationSnapshot(
  setNumber: string,
  set: SetData,
  condition: string,
  confidenceScore: number,
  estimatedValue: number,
  msrp: number,
): void {
  const normalized = setNumber.trim();
  const existing = loadRawSnapshots(normalized);
  const conditionMultiplier =
    msrp > 0
      ? Math.round((estimatedValue / msrp) * 100) / 100
      : 1;

  const snapshot: RecommendationSnapshot = {
    date: new Date().toISOString(),
    recommendation: set.recommendation,
    confidenceScore,
    estimatedValue,
    condition,
    conditionMultiplier,
  };

  if (existing.length === 0) {
    saveRawSnapshots(normalized, [snapshot]);
    return;
  }

  const latest = existing[existing.length - 1];
  const recChanged = latest.recommendation !== snapshot.recommendation;
  const confidenceDelta = Math.abs(
    snapshot.confidenceScore - latest.confidenceScore,
  );

  if (!recChanged && confidenceDelta < CONFIDENCE_SAVE_THRESHOLD) {
    return;
  }

  const next = [...existing, snapshot];
  if (next.length > MAX_SNAPSHOTS) {
    next.splice(0, next.length - MAX_SNAPSHOTS);
  }
  saveRawSnapshots(normalized, next);
}

export function getRecommendationHistory(
  setNumber: string,
): RecommendationSnapshot[] {
  const snapshots = loadRawSnapshots(setNumber.trim());
  return [...snapshots].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getRecommendationChanges(
  setNumber: string,
): RecommendationChange[] {
  const chronological = [...loadRawSnapshots(setNumber.trim())].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const changes: RecommendationChange[] = [];

  for (let i = 1; i < chronological.length; i++) {
    const prev = chronological[i - 1];
    const curr = chronological[i];
    if (prev.recommendation !== curr.recommendation) {
      changes.push({
        date: curr.date,
        from: prev.recommendation,
        to: curr.recommendation,
        confidenceFrom: prev.confidenceScore,
        confidenceTo: curr.confidenceScore,
        valueTo: curr.estimatedValue,
      });
    }
  }

  return changes.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function hasRecommendationChanged(setNumber: string): boolean {
  const history = getRecommendationHistory(setNumber);
  if (history.length < 2) return false;
  return history[0].recommendation !== history[1].recommendation;
}

export function getTrend(setNumber: string): RecommendationTrend {
  const history = getRecommendationHistory(setNumber);
  if (history.length < 2) return "stable";

  const recent = history.slice(0, Math.min(3, history.length));
  if (recent.length < 2) return "stable";

  const scores = recent.map((s) => s.confidenceScore).reverse();
  const oldest = scores[0];
  const newest = scores[scores.length - 1];
  const delta = newest - oldest;

  if (Math.abs(delta) < 5) return "stable";
  return delta > 0 ? "improving" : "declining";
}

export function getConfidenceDeltaSinceFirst(setNumber: string): number | null {
  const history = getRecommendationHistory(setNumber);
  if (history.length < 2) return null;
  const first = history[history.length - 1];
  const latest = history[0];
  return latest.confidenceScore - first.confidenceScore;
}

export function getStableRecommendationDays(setNumber: string): number | null {
  const history = getRecommendationHistory(setNumber);
  if (history.length === 0) return null;
  const latestRec = history[0].recommendation;
  const changeDates = getRecommendationChanges(setNumber)
    .filter((c) => c.to === latestRec)
    .map((c) => new Date(c.date).getTime());

  const since =
    changeDates.length > 0
      ? Math.max(...changeDates)
      : new Date(history[history.length - 1].date).getTime();

  return Math.max(
    0,
    Math.floor((Date.now() - since) / (1000 * 60 * 60 * 24)),
  );
}

export function getAllTrackedSetNumbers(): string[] {
  if (typeof window === "undefined") return [];
  const numbers: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(HISTORY_KEY_PREFIX)) {
      numbers.push(key.slice(HISTORY_KEY_PREFIX.length));
    }
  }
  return numbers.sort();
}

export interface SetHistorySummary {
  setNumber: string;
  snapshots: RecommendationSnapshot[];
  analysisCount: number;
  firstDate: string;
  latest: RecommendationSnapshot;
  trend: RecommendationTrend;
  everChanged: boolean;
  changeCount: number;
}

export function getSetHistorySummary(
  setNumber: string,
): SetHistorySummary | null {
  const snapshots = getRecommendationHistory(setNumber);
  if (snapshots.length === 0) return null;
  const changes = getRecommendationChanges(setNumber);
  return {
    setNumber: setNumber.trim(),
    snapshots,
    analysisCount: snapshots.length,
    firstDate: snapshots[snapshots.length - 1].date,
    latest: snapshots[0],
    trend: getTrend(setNumber),
    everChanged: changes.length > 0,
    changeCount: changes.length,
  };
}

export function getGlobalHistorySummaries(): SetHistorySummary[] {
  return getAllTrackedSetNumbers()
    .map((num) => getSetHistorySummary(num))
    .filter((s): s is SetHistorySummary => s !== null)
    .sort(
      (a, b) =>
        new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime(),
    );
}

export function getTrendIndicator(trend: RecommendationTrend): {
  arrow: string;
  label: string;
  className: string;
} {
  switch (trend) {
    case "improving":
      return {
        arrow: "↑",
        label: "Confidence improving over last 3 analyses",
        className: "text-emerald-400",
      };
    case "declining":
      return {
        arrow: "↓",
        label: "Confidence declining over last 3 analyses",
        className: "text-red-400",
      };
    default:
      return {
        arrow: "→",
        label: "Confidence stable over recent analyses",
        className: "text-zinc-500",
      };
  }
}
