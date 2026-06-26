import {
  getTierForSetNumber,
} from "@/lib/retiring-soon";
import type {
  Condition,
  Recommendation,
} from "@/lib/analyze-types";
import type { SetData } from "@/lib/confidence";

export const HISTORY_KEY_PREFIX = "lego-rec-history-";
export const HISTORY_LAST_SEEN_KEY = "lego-history-last-seen";
const MAX_SNAPSHOTS = 20;
const CONFIDENCE_SAVE_THRESHOLD = 5;

export interface RecommendationSnapshot {
  date: string;
  recommendation: Recommendation;
  confidenceScore: number;
  opportunityScore: number;
  estimatedValue: number;
  adjustedValue: number;
  condition: string;
  note?: string;
  /** @deprecated legacy field */
  conditionMultiplier?: number;
  retired?: boolean;
  retiringSoon?: boolean;
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

export type JourneyStep = RecommendationSnapshot & {
  recChangedFromPrevious: boolean;
  valueChangeFromPrevious: number | null;
  valueChangePercentFromPrevious: number | null;
  confidenceChangeFromPrevious: number | null;
};

export type Journey = JourneyStep[];

export interface ValueChangeResult {
  firstValue: number;
  currentValue: number;
  changePercent: number;
  changeDollars: number;
  daysTracked: number;
}

function historyKey(setNumber: string): string {
  return `${HISTORY_KEY_PREFIX}${setNumber.trim()}`;
}

function normalizeSnapshot(raw: Partial<RecommendationSnapshot>): RecommendationSnapshot {
  const estimatedValue = raw.estimatedValue ?? 0;
  return {
    date: raw.date ?? new Date().toISOString(),
    recommendation: raw.recommendation ?? "HOLD",
    confidenceScore: raw.confidenceScore ?? 0,
    opportunityScore: raw.opportunityScore ?? 0,
    estimatedValue,
    adjustedValue: raw.adjustedValue ?? estimatedValue,
    condition: raw.condition ?? "sealed",
    note: raw.note,
    conditionMultiplier: raw.conditionMultiplier,
    retired: raw.retired,
    retiringSoon: raw.retiringSoon,
  };
}

function loadRawSnapshots(setNumber: string): RecommendationSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey(setNumber));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<RecommendationSnapshot>[];
    return Array.isArray(parsed) ? parsed.map(normalizeSnapshot) : [];
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

function chronological(snapshots: RecommendationSnapshot[]): RecommendationSnapshot[] {
  return [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function formatHistoryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatHistoryDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
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
  opportunityScore = 0,
  note?: string,
): void {
  const normalized = setNumber.trim();
  const existing = loadRawSnapshots(normalized);
  const catalogue = null;
  const adjustedValue = estimatedValue;

  const snapshot: RecommendationSnapshot = {
    date: new Date().toISOString(),
    recommendation: set.recommendation,
    confidenceScore,
    opportunityScore,
    estimatedValue,
    adjustedValue,
    condition,
    note,
    conditionMultiplier:
      msrp > 0 ? Math.round((estimatedValue / msrp) * 100) / 100 : 1,
    retired: undefined,
    retiringSoon: getTierForSetNumber(normalized) !== null,
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
  const ordered = chronological(loadRawSnapshots(setNumber.trim()));
  const changes: RecommendationChange[] = [];

  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const curr = ordered[i];
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

export function getValueChange(setNumber: string): ValueChangeResult | null {
  const ordered = chronological(loadRawSnapshots(setNumber.trim()));
  if (ordered.length === 0) return null;
  const first = ordered[0];
  const current = ordered[ordered.length - 1];
  const changeDollars = current.estimatedValue - first.estimatedValue;
  const changePercent =
    first.estimatedValue > 0
      ? Math.round((changeDollars / first.estimatedValue) * 100)
      : 0;
  const daysTracked = Math.max(
    0,
    Math.floor(
      (new Date(current.date).getTime() - new Date(first.date).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  return {
    firstValue: first.estimatedValue,
    currentValue: current.estimatedValue,
    changePercent,
    changeDollars,
    daysTracked,
  };
}

export function getRecommendationJourney(setNumber: string): Journey {
  const ordered = chronological(loadRawSnapshots(setNumber.trim()));
  return ordered.map((snapshot, index) => {
    const previous = index > 0 ? ordered[index - 1] : null;
    const recChangedFromPrevious = Boolean(
      previous && previous.recommendation !== snapshot.recommendation,
    );
    const valueChangeFromPrevious = previous
      ? snapshot.estimatedValue - previous.estimatedValue
      : null;
    const valueChangePercentFromPrevious =
      previous && previous.estimatedValue > 0 && valueChangeFromPrevious !== null
        ? Math.round((valueChangeFromPrevious / previous.estimatedValue) * 100)
        : null;
    const confidenceChangeFromPrevious = previous
      ? snapshot.confidenceScore - previous.confidenceScore
      : null;
    return {
      ...snapshot,
      recChangedFromPrevious,
      valueChangeFromPrevious,
      valueChangePercentFromPrevious,
      confidenceChangeFromPrevious,
    };
  });
}

export function getMostTrackedSets(): {
  setNumber: string;
  count: number;
  name: string;
}[] {
  return getAllTrackedSetNumbers()
    .map((setNumber) => ({
      setNumber,
      count: loadRawSnapshots(setNumber).length,
      name: `Set #${setNumber}`,
    }))
    .sort((a, b) => b.count - a.count);
}

export function getRecommendationChangeSets(): string[] {
  return getAllTrackedSetNumbers().filter(
    (setNumber) => getRecommendationChanges(setNumber).length > 0,
  );
}

export function hasRecommendationChanged(setNumber: string): boolean {
  return getRecommendationChanges(setNumber).length > 0;
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
  const ordered = chronological(loadRawSnapshots(setNumber.trim()));
  if (ordered.length < 2) return null;
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
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
  setName: string;
  theme: string;
  snapshots: RecommendationSnapshot[];
  journey: Journey;
  analysisCount: number;
  firstDate: string;
  latest: RecommendationSnapshot;
  first: RecommendationSnapshot;
  trend: RecommendationTrend;
  everChanged: boolean;
  changeCount: number;
  valueChange: ValueChangeResult | null;
  confidenceDelta: number | null;
  holdToSellChange: RecommendationChange | null;
  retirementStatusChanged: boolean;
}

export function getRetirementStatusChanged(setNumber: string): boolean {
  const ordered = chronological(loadRawSnapshots(setNumber.trim()));
  if (ordered.length < 2) return false;
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  return (
    (first.retired ?? false) !== (latest.retired ?? false) ||
    (first.retiringSoon ?? false) !== (latest.retiringSoon ?? false)
  );
}

export function getSetHistorySummary(
  setNumber: string,
): SetHistorySummary | null {
  const snapshots = getRecommendationHistory(setNumber);
  if (snapshots.length === 0) return null;
  const changes = getRecommendationChanges(setNumber);
  const ordered = chronological(loadRawSnapshots(setNumber.trim()));
  const holdToSellChange =
    changes.find((c) => c.from === "HOLD" && c.to === "SELL") ?? null;

  return {
    setNumber: setNumber.trim(),
    setName: `Set #${setNumber}`,
    theme: "Unknown",
    snapshots,
    journey: getRecommendationJourney(setNumber),
    analysisCount: snapshots.length,
    firstDate: ordered[0].date,
    latest: snapshots[0],
    first: ordered[0],
    trend: getTrend(setNumber),
    everChanged: changes.length > 0,
    changeCount: changes.length,
    valueChange: getValueChange(setNumber),
    confidenceDelta: getConfidenceDeltaSinceFirst(setNumber),
    holdToSellChange,
    retirementStatusChanged: getRetirementStatusChanged(setNumber),
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

export function getHistoryInsights(): string[] {
  const summaries = getGlobalHistorySummaries();
  if (summaries.length === 0) return [];

  const insights: string[] = [];
  const totalAnalyses = summaries.reduce((sum, s) => sum + s.analysisCount, 0);
  const earliest = summaries.reduce((min, s) =>
    new Date(s.firstDate).getTime() < new Date(min.firstDate).getTime() ? s : min,
  );
  const daysSpan = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(earliest.firstDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  insights.push(
    `You've analysed ${summaries.length} sets over ${daysSpan} days (${totalAnalyses} total analyses)`,
  );

  const valueChanges = summaries
    .map((s) => s.valueChange?.changePercent ?? 0)
    .filter((_, i) => summaries[i].valueChange);
  if (valueChanges.length > 0) {
    const avg =
      Math.round(
        valueChanges.reduce((sum, v) => sum + v, 0) / valueChanges.length,
      );
    insights.push(
      `Your average analysed set has ${avg >= 0 ? "appreciated" : "changed"} ${avg >= 0 ? "+" : ""}${avg}% since first view`,
    );
  }

  const changedCount = summaries.filter((s) => s.everChanged).length;
  if (changedCount > 0) {
    insights.push(
      `${changedCount} of your analysed sets changed recommendation — you caught the signals`,
    );
  }

  const mostTracked = getMostTrackedSets()[0];
  if (mostTracked) {
    insights.push(
      `Your most tracked set is ${mostTracked.name} — analysed ${mostTracked.count} times`,
    );
  }

  const themeMap = new Map<string, number[]>();
  for (const summary of summaries) {
    if (!summary.valueChange) continue;
    const arr = themeMap.get(summary.theme) ?? [];
    arr.push(summary.valueChange.changePercent);
    themeMap.set(summary.theme, arr);
  }
  let bestTheme: { theme: string; avg: number } | null = null;
  for (const [theme, values] of themeMap.entries()) {
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    if (!bestTheme || avg > bestTheme.avg) bestTheme = { theme, avg };
  }
  if (bestTheme) {
    insights.push(
      `Best performing theme in your history: ${bestTheme.theme} averaging +${bestTheme.avg}%`,
    );
  }

  return insights;
}

export function getBestAndWorstCalls(): {
  best: (SetHistorySummary & { rank: number })[];
  worst: SetHistorySummary[];
} {
  const summaries = getGlobalHistorySummaries().filter((s) => s.valueChange);
  const sorted = [...summaries].sort(
    (a, b) =>
      (b.valueChange?.changePercent ?? 0) - (a.valueChange?.changePercent ?? 0),
  );
  const best = sorted.slice(0, 3).map((s, i) => ({ ...s, rank: i + 1 }));
  const worst = [...summaries]
    .filter((s) => (s.valueChange?.changePercent ?? 0) < 0)
    .sort(
      (a, b) =>
        (a.valueChange?.changePercent ?? 0) - (b.valueChange?.changePercent ?? 0),
    )
    .slice(0, 3);
  return { best, worst };
}

export function markHistorySeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_LAST_SEEN_KEY, new Date().toISOString());
}

export function hasUnreadHistoryChanges(): boolean {
  if (typeof window === "undefined") return false;
  const lastSeenRaw = localStorage.getItem(HISTORY_LAST_SEEN_KEY);
  const lastSeen = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
  for (const setNumber of getRecommendationChangeSets()) {
    const changes = getRecommendationChanges(setNumber);
    const latestChange = changes[0];
    if (latestChange && new Date(latestChange.date).getTime() > lastSeen) {
      return true;
    }
  }
  return false;
}

export function getLatestRecommendationChangeDate(): string | null {
  let latest: string | null = null;
  for (const setNumber of getRecommendationChangeSets()) {
    const change = getRecommendationChanges(setNumber)[0];
    if (!change) continue;
    if (!latest || new Date(change.date).getTime() > new Date(latest).getTime()) {
      latest = change.date;
    }
  }
  return latest;
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
        label: "Improving",
        className: "text-emerald-400",
      };
    case "declining":
      return {
        arrow: "↓",
        label: "Declining",
        className: "text-red-400",
      };
    default:
      return {
        arrow: "→",
        label: "Stable",
        className: "text-zinc-500",
      };
  }
}

export function buildShareBestCallText(
  summary: SetHistorySummary,
  formatPrice: (aud: number) => string,
): string {
  const vc = summary.valueChange;
  if (!vc) return "";
  return `📈 My best LEGO investment call on BrickValue:

${summary.setName} (#${summary.setNumber})
First analysed: ${formatHistoryDate(summary.firstDate)} at ${formatPrice(vc.firstValue)} AUD
Current value: ${formatPrice(vc.currentValue)} AUD
Return: ${vc.changePercent >= 0 ? "+" : ""}${vc.changePercent}% in ${vc.daysTracked} days

Track your LEGO collection at https://brickvalue.app`;
}
