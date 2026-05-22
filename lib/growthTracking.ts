import { analyzeSet } from "@/lib/analyze";
import {
  calculateConfidence,
  setDataFromLegoSet,
} from "@/lib/confidence";
import {
  computeHealthScore,
  syncItemTotals,
  type PortfolioItem,
} from "@/lib/portfolio";

export const GROWTH_SNAPSHOTS_KEY = "lego-growth-snapshots";
const MAX_SNAPSHOTS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GrowthSnapshot {
  date: string;
  totalSets: number;
  totalUniqueSets: number;
  totalCopies: number;
  totalPaid: number;
  totalEstimatedValue: number;
  totalProfitLoss: number;
  profitLossPercent: number;
  healthScore: number;
  confidenceAvg: number;
  themeBreakdown: Record<string, number>;
  newSetsAdded: string[];
  setsRemoved: string[];
}

export interface GrowthSummary {
  totalGrowthPercent: number;
  totalGrowthDollars: number;
  bestMonth: { month: string; growth: number };
  worstMonth: { month: string; growth: number };
  averageMonthlyGrowth: number;
  daysTracked: number;
  setsAddedTotal: number;
  setsRemovedTotal: number;
}

export type GrowthDateRange = "7d" | "30d" | "90d" | "all";

function loadRaw(): GrowthSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GROWTH_SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GrowthSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(snapshots: GrowthSnapshot[]): void {
  const trimmed = snapshots.slice(-MAX_SNAPSHOTS);
  localStorage.setItem(GROWTH_SNAPSHOTS_KEY, JSON.stringify(trimmed));
}

function getSetNumbers(portfolio: PortfolioItem[]): string[] {
  return portfolio.map((i) => i.setNumber.trim());
}

function buildThemeBreakdown(
  portfolio: PortfolioItem[],
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const item of portfolio) {
    breakdown[item.theme] = (breakdown[item.theme] ?? 0) + item.quantity;
  }
  return breakdown;
}

function computeConfidenceAvg(portfolio: PortfolioItem[]): number {
  const scores: number[] = [];
  for (const item of portfolio) {
    const analysis = analyzeSet(item.setNumber, item.condition);
    if (!analysis) continue;
    scores.push(
      calculateConfidence(
        setDataFromLegoSet(
          analysis.set,
          analysis.recommendation,
          analysis.estimatedValue,
        ),
        item.condition,
      ).score,
    );
  }
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function buildGrowthSnapshot(
  portfolio: PortfolioItem[],
  previous: GrowthSnapshot | null,
): GrowthSnapshot {
  const synced = portfolio.map(syncItemTotals);
  const currentSetNumbers = getSetNumbers(synced);
  const prevSetNumbers = previous
    ? reconstructSetsAtSnapshot(previous)
    : [];

  const prevSet = new Set(prevSetNumbers);
  const currSet = new Set(currentSetNumbers);

  const newSetsAdded = currentSetNumbers.filter((n) => !prevSet.has(n));
  const setsRemoved = prevSetNumbers.filter((n) => !currSet.has(n));

  const totalPaid = synced.reduce((sum, i) => sum + i.totalPaid, 0);
  const totalEstimatedValue = synced.reduce(
    (sum, i) => sum + i.totalEstimatedValue,
    0,
  );
  const totalProfitLoss = totalEstimatedValue - totalPaid;
  const profitLossPercent =
    totalPaid > 0
      ? Math.round((totalProfitLoss / totalPaid) * 100)
      : 0;

  const totalCopies = synced.reduce((sum, i) => sum + i.quantity, 0);
  const uniqueCount = synced.length;

  const bestPercentGain =
    synced.length > 0
      ? Math.max(...synced.map((i) => (i.totalEstimatedValue - i.totalPaid) / Math.max(i.totalPaid, 1) * 100))
      : 0;

  const healthScore = computeHealthScore(
    synced,
    totalProfitLoss,
    bestPercentGain,
  );

  return {
    date: new Date().toISOString(),
    totalSets: uniqueCount,
    totalUniqueSets: uniqueCount,
    totalCopies,
    totalPaid,
    totalEstimatedValue,
    totalProfitLoss,
    profitLossPercent,
    healthScore,
    confidenceAvg: computeConfidenceAvg(synced),
    themeBreakdown: buildThemeBreakdown(synced),
    newSetsAdded,
    setsRemoved,
  };
}

/** Reconstruct set numbers at a snapshot from cumulative adds/removes */
function reconstructSetsAtSnapshot(snapshot: GrowthSnapshot): string[] {
  const all = loadRaw();
  const index = all.findIndex((s) => s.date === snapshot.date);
  if (index < 0) return [];
  let sets: string[] = [];
  for (let i = 0; i <= index; i++) {
    for (const added of all[i].newSetsAdded) {
      if (!sets.includes(added)) sets.push(added);
    }
    for (const removed of all[i].setsRemoved) {
      sets = sets.filter((n) => n !== removed);
    }
  }
  return sets;
}

function snapshotsEqual(
  a: GrowthSnapshot,
  b: GrowthSnapshot,
): boolean {
  return (
    a.totalSets === b.totalSets &&
    a.totalCopies === b.totalCopies &&
    a.totalPaid === b.totalPaid &&
    a.totalEstimatedValue === b.totalEstimatedValue &&
    JSON.stringify(a.newSetsAdded) === JSON.stringify(b.newSetsAdded) &&
    JSON.stringify(a.setsRemoved) === JSON.stringify(b.setsRemoved)
  );
}

function shouldSaveSnapshot(
  portfolio: PortfolioItem[],
  existing: GrowthSnapshot[],
  next: GrowthSnapshot,
): boolean {
  if (portfolio.length === 0) return false;
  if (existing.length === 0) return true;

  const last = existing[existing.length - 1];

  if (
    next.newSetsAdded.length > 0 ||
    next.setsRemoved.length > 0
  ) {
    return true;
  }

  const elapsed = Date.now() - new Date(last.date).getTime();
  if (elapsed >= DAY_MS) return true;

  if (
    last.totalEstimatedValue !== next.totalEstimatedValue ||
    last.totalPaid !== next.totalPaid
  ) {
    return elapsed >= DAY_MS / 2;
  }

  return false;
}

export function saveGrowthSnapshot(portfolio: PortfolioItem[]): void {
  if (typeof window === "undefined") return;
  if (portfolio.length === 0) return;

  const existing = loadRaw();
  const previous = existing.length > 0 ? existing[existing.length - 1] : null;
  const next = buildGrowthSnapshot(portfolio, previous);

  if (!shouldSaveSnapshot(portfolio, existing, next)) return;

  if (previous && snapshotsEqual(previous, next)) {
    const elapsed = Date.now() - new Date(previous.date).getTime();
    if (elapsed < DAY_MS) return;
  }

  saveRaw([...existing, next]);
}

export function getGrowthSnapshots(): GrowthSnapshot[] {
  return loadRaw().sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function filterSnapshotsByRange(
  snapshots: GrowthSnapshot[],
  range: GrowthDateRange,
): GrowthSnapshot[] {
  if (range === "all" || snapshots.length === 0) return snapshots;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = Date.now() - days * DAY_MS;
  const filtered = snapshots.filter(
    (s) => new Date(s.date).getTime() >= cutoff,
  );
  if (filtered.length === 0) return snapshots.slice(-1);
  const firstBefore = snapshots.filter(
    (s) => new Date(s.date).getTime() < cutoff,
  );
  if (firstBefore.length > 0 && filtered[0] !== firstBefore[firstBefore.length - 1]) {
    return [firstBefore[firstBefore.length - 1], ...filtered];
  }
  return filtered;
}

export function getGrowthSummary(): GrowthSummary | null {
  const snapshots = getGrowthSnapshots();
  if (snapshots.length === 0) return null;

  const first = snapshots[0];
  const latest = snapshots[snapshots.length - 1];
  const totalGrowthDollars =
    latest.totalEstimatedValue - first.totalEstimatedValue;
  const totalGrowthPercent =
    first.totalEstimatedValue > 0
      ? Math.round(
          (totalGrowthDollars / first.totalEstimatedValue) * 100,
        )
      : 0;

  const daysTracked = Math.max(
    1,
    Math.floor(
      (new Date(latest.date).getTime() - new Date(first.date).getTime()) /
        DAY_MS,
    ),
  );

  const monthlyGrowth = getMonthlyGrowthMap(snapshots);
  const monthEntries = [...monthlyGrowth.entries()];
  let bestMonth = { month: "—", growth: 0 };
  let worstMonth = { month: "—", growth: 0 };

  if (monthEntries.length > 0) {
    const bestEntry = monthEntries.reduce((best, [month, growth]) =>
      growth > best[1] ? [month, growth] : best,
    );
    const worstEntry = monthEntries.reduce((worst, [month, growth]) =>
      growth < worst[1] ? [month, growth] : worst,
    );
    bestMonth = {
      month: formatMonthKey(bestEntry[0]),
      growth: bestEntry[1],
    };
    worstMonth = {
      month: formatMonthKey(worstEntry[0]),
      growth: worstEntry[1],
    };
  }

  const averageMonthlyGrowth =
    monthEntries.length > 0
      ? Math.round(
          monthEntries.reduce((sum, [, g]) => sum + g, 0) /
            monthEntries.length,
        )
      : 0;

  let setsAddedTotal = 0;
  let setsRemovedTotal = 0;
  for (const snap of snapshots) {
    setsAddedTotal += snap.newSetsAdded.length;
    setsRemovedTotal += snap.setsRemoved.length;
  }

  return {
    totalGrowthPercent,
    totalGrowthDollars,
    bestMonth,
    worstMonth,
    averageMonthlyGrowth,
    daysTracked,
    setsAddedTotal,
    setsRemovedTotal,
  };
}

function formatMonthKey(key: string): string {
  const [y, m] = key.split("-");
  if (!y || !m) return key;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getMonthlyGrowthMap(
  snapshots: GrowthSnapshot[],
): Map<string, number> {
  const byMonth = groupSnapshotsByMonth(snapshots);
  const growth = new Map<string, number>();
  for (const [month, rows] of byMonth) {
    if (rows.length === 0) continue;
    const start = rows[0].totalEstimatedValue;
    const end = rows[rows.length - 1].totalEstimatedValue;
    growth.set(month, end - start);
  }
  return growth;
}

export function getValueAtDate(date: string): number | null {
  const snapshots = getGrowthSnapshots();
  if (snapshots.length === 0) return null;
  const target = new Date(date).getTime();
  let closest = snapshots[0];
  let minDiff = Math.abs(new Date(closest.date).getTime() - target);

  for (const snap of snapshots) {
    const diff = Math.abs(new Date(snap.date).getTime() - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = snap;
    }
  }
  return closest.totalEstimatedValue;
}

export interface MonthlyGrowthRow {
  month: string;
  monthLabel: string;
  startingValue: number;
  endingValue: number;
  changeDollars: number;
  changePercent: number;
  setsAdded: number;
  setsRemoved: number;
}

export function groupSnapshotsByMonth(
  snapshots: GrowthSnapshot[],
): Map<string, GrowthSnapshot[]> {
  const map = new Map<string, GrowthSnapshot[]>();
  for (const snap of snapshots) {
    const d = new Date(snap.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = map.get(key) ?? [];
    list.push(snap);
    map.set(key, list);
  }
  return map;
}

export function getMonthlyBreakdown(
  snapshots: GrowthSnapshot[],
): MonthlyGrowthRow[] {
  const byMonth = groupSnapshotsByMonth(snapshots);
  const rows: MonthlyGrowthRow[] = [];

  for (const [month, snaps] of [...byMonth.entries()].sort()) {
    const start = snaps[0];
    const end = snaps[snaps.length - 1];
    const changeDollars = end.totalEstimatedValue - start.totalEstimatedValue;
    const changePercent =
      start.totalEstimatedValue > 0
        ? Math.round(
            (changeDollars / start.totalEstimatedValue) * 100,
          )
        : 0;
    let setsAdded = 0;
    let setsRemoved = 0;
    for (const s of snaps) {
      setsAdded += s.newSetsAdded.length;
      setsRemoved += s.setsRemoved.length;
    }
    const [y, m] = month.split("-");
    const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
      "en-GB",
      { month: "long", year: "numeric" },
    );
    rows.push({
      month,
      monthLabel,
      startingValue: start.totalEstimatedValue,
      endingValue: end.totalEstimatedValue,
      changeDollars,
      changePercent,
      setsAdded,
      setsRemoved,
    });
  }
  return rows;
}

export interface GrowthMilestone {
  date: string;
  icon: string;
  description: string;
}

export function detectGrowthMilestones(
  snapshots: GrowthSnapshot[],
): GrowthMilestone[] {
  if (snapshots.length === 0) return [];
  const milestones: GrowthMilestone[] = [];

  const firstWithSets = snapshots.find((s) => s.totalSets > 0);
  if (firstWithSets) {
    milestones.push({
      date: firstWithSets.date,
      icon: "🎯",
      description: "First set added",
    });
  }

  const firstProfit = snapshots.find((s) => s.totalProfitLoss > 0);
  if (firstProfit) {
    milestones.push({
      date: firstProfit.date,
      icon: "📈",
      description: "First profit",
    });
  }

  const thresholds = [
    { value: 500, label: "Crossed $500 value" },
    { value: 1000, label: "Crossed $1000 value" },
    { value: 5000, label: "Crossed $5000 value" },
  ];

  for (const { value, label } of thresholds) {
    const cross = snapshots.find(
      (s, i) =>
        s.totalEstimatedValue >= value &&
        (i === 0 || snapshots[i - 1].totalEstimatedValue < value),
    );
    if (cross) {
      milestones.push({
        date: cross.date,
        icon: "💰",
        description: label,
      });
    }
  }

  const best = snapshots.reduce((max, s) =>
    s.totalEstimatedValue > max.totalEstimatedValue ? s : max,
  );
  milestones.push({
    date: best.date,
    icon: "🏆",
    description: "Best ever value",
  });

  const tenSets = snapshots.find(
    (s, i) =>
      s.totalSets >= 10 &&
      (i === 0 || snapshots[i - 1].totalSets < 10),
  );
  if (tenSets) {
    milestones.push({
      date: tenSets.date,
      icon: "📦",
      description: "10 sets milestone",
    });
  }

  const seen = new Set<string>();
  return milestones.filter((m) => {
    const key = m.description;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export interface ThemeGrowthInsight {
  theme: string;
  setsStart: number;
  setsNow: number;
  valueStart: number;
  valueNow: number;
  setsAdded: number;
}

export function getThemeGrowthInsights(
  portfolio: PortfolioItem[],
  snapshots: GrowthSnapshot[],
): ThemeGrowthInsight[] {
  if (snapshots.length === 0) return [];
  const first = snapshots[0];
  const synced = portfolio.map(syncItemTotals);
  const nowByTheme: Record<string, { count: number; value: number }> = {};

  for (const item of synced) {
    if (!nowByTheme[item.theme]) {
      nowByTheme[item.theme] = { count: 0, value: 0 };
    }
    nowByTheme[item.theme].count += item.quantity;
    nowByTheme[item.theme].value += item.totalEstimatedValue;
  }

  const allThemes = new Set([
    ...Object.keys(first.themeBreakdown),
    ...Object.keys(nowByTheme),
  ]);

  const firstTotalCopies = Object.values(first.themeBreakdown).reduce(
    (a, b) => a + b,
    0,
  );

  return [...allThemes].map((theme) => {
    const setsStart = first.themeBreakdown[theme] ?? 0;
    const setsNow = nowByTheme[theme]?.count ?? 0;
    const valueNow = nowByTheme[theme]?.value ?? 0;
    const shareStart =
      firstTotalCopies > 0 ? setsStart / firstTotalCopies : 0;
    const valueStart = Math.round(
      first.totalEstimatedValue * shareStart,
    );
    return {
      theme,
      setsStart,
      setsNow,
      valueStart,
      valueNow,
      setsAdded: Math.max(0, setsNow - setsStart),
    };
  }).sort((a, b) => b.valueNow - a.valueNow);
}

export function getPortfolioGrowthPercent(): {
  percent: number;
  dollars: number;
} | null {
  const summary = getGrowthSummary();
  if (!summary) return null;
  return {
    percent: summary.totalGrowthPercent,
    dollars: summary.totalGrowthDollars,
  };
}
