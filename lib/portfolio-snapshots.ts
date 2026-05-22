import type { PortfolioMetrics } from "@/lib/portfolio";

export const PORTFOLIO_SNAPSHOTS_KEY = "lego-portfolio-snapshots";
export const MAX_SNAPSHOTS = 30;
const MIN_MS_BETWEEN_SNAPSHOTS = 24 * 60 * 60 * 1000;

export interface PortfolioSnapshot {
  date: string;
  totalPaid: number;
  totalEstimatedValue: number;
  totalProfitLoss: number;
  profitLossPercent: number;
  healthScore: number;
  sellCount: number;
  holdCount: number;
  totalSets: number;
}

export function loadSnapshots(): PortfolioSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PortfolioSnapshot[];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: PortfolioSnapshot[]): void {
  const trimmed = snapshots.slice(-MAX_SNAPSHOTS);
  localStorage.setItem(PORTFOLIO_SNAPSHOTS_KEY, JSON.stringify(trimmed));
}

export function resetSnapshots(): void {
  localStorage.removeItem(PORTFOLIO_SNAPSHOTS_KEY);
}

export function snapshotFromMetrics(
  metrics: PortfolioMetrics,
): PortfolioSnapshot {
  return {
    date: new Date().toISOString(),
    totalPaid: metrics.totalPaid,
    totalEstimatedValue: metrics.totalEstimated,
    totalProfitLoss: metrics.totalProfit,
    profitLossPercent: metrics.percentGain,
    healthScore: metrics.healthScore,
    sellCount: metrics.sellCount,
    holdCount: metrics.holdCount,
    totalSets: metrics.totalSets,
  };
}

export function shouldRecordSnapshot(snapshots: PortfolioSnapshot[]): boolean {
  if (snapshots.length === 0) return true;
  const last = snapshots[snapshots.length - 1];
  const elapsed = Date.now() - new Date(last.date).getTime();
  return elapsed >= MIN_MS_BETWEEN_SNAPSHOTS;
}

/** Record snapshot if 24h elapsed; returns updated sorted list. */
export function recordSnapshotIfDue(
  metrics: PortfolioMetrics,
): PortfolioSnapshot[] {
  const existing = loadSnapshots();
  if (!shouldRecordSnapshot(existing)) {
    return existing;
  }
  const next = [...existing, snapshotFromMetrics(metrics)];
  saveSnapshots(next);
  return next.slice(-MAX_SNAPSHOTS);
}

export function healthScoreColorClass(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-[#f59e0b]";
  return "text-red-400";
}

export type PortfolioDirection = "growing" | "stable" | "declining";

export function getPortfolioDirection(
  valueChangePercent: number,
): PortfolioDirection {
  if (valueChangePercent > 2) return "growing";
  if (valueChangePercent < -2) return "declining";
  return "stable";
}

export function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function formatSnapshotDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function trendArrow(
  current: number,
  previous: number,
): "↑" | "↓" | "→" {
  if (current > previous) return "↑";
  if (current < previous) return "↓";
  return "→";
}
