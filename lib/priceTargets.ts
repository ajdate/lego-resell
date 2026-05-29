import { analyzeSet, type Condition } from "@/lib/analyze";
import type { SetData } from "@/lib/confidence";

export const PRICE_TARGETS_KEY = "lego-price-targets";

export type TargetType = "sell" | "buy";
export type TargetStatus = "active" | "achieved" | "expired";
export type TargetVelocity = "accelerating" | "on-track" | "slow" | "stalled";

export interface PriceTarget {
  id: string;
  setNumber: string;
  setName: string;
  theme: string;
  condition: string;
  targetType: TargetType;
  targetPrice: number;
  currentPrice: number;
  priceAtCreation: number;
  dateCreated: string;
  dateAchieved?: string;
  achievedManually?: boolean;
  status: TargetStatus;
  notes?: string;
}

export interface TargetProgress {
  target: PriceTarget;
  progressPercent: number;
  remainingAmount: number;
  changeFromCreation: number;
  changePercent: number;
  estimatedMonthsToTarget: number | null;
  estimatedMonthsLabel: string;
  isAchieved: boolean;
  isClose: boolean;
  velocity: TargetVelocity;
  movingTowardTarget: boolean;
}

export interface TargetSetContext {
  setNumber: string;
  estimatedValue: number;
  condition?: string;
}

function loadRawTargets(): PriceTarget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRICE_TARGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PriceTarget[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistTargets(targets: PriceTarget[]): void {
  localStorage.setItem(PRICE_TARGETS_KEY, JSON.stringify(targets));
}

export function generateTargetId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `target-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function saveTarget(target: PriceTarget): void {
  const targets = loadRawTargets();
  const index = targets.findIndex((t) => t.id === target.id);
  if (index >= 0) {
    targets[index] = target;
  } else {
    targets.push(target);
  }
  persistTargets(targets);
}

export function getTargets(): PriceTarget[] {
  return loadRawTargets();
}

export function getActiveTargets(): PriceTarget[] {
  return getTargets().filter((t) => t.status === "active");
}

export function getAchievedTargets(): PriceTarget[] {
  return getTargets().filter((t) => t.status === "achieved");
}

export function getTargetById(id: string): PriceTarget | undefined {
  return getTargets().find((t) => t.id === id);
}

export function getTargetsForSet(setNumber: string): PriceTarget[] {
  const normalized = setNumber.trim();
  return getTargets().filter((t) => t.setNumber.trim() === normalized);
}

export function getActiveTargetForSet(
  setNumber: string,
  targetType?: TargetType,
): PriceTarget | undefined {
  return getTargetsForSet(setNumber).find(
    (t) =>
      t.status === "active" && (targetType ? t.targetType === targetType : true),
  );
}

export function deleteTarget(id: string): void {
  persistTargets(loadRawTargets().filter((t) => t.id !== id));
}

export function markTargetAchieved(id: string, manual = false): PriceTarget | null {
  const target = getTargetById(id);
  if (!target) return null;
  const updated: PriceTarget = {
    ...target,
    status: "achieved",
    dateAchieved: manual ? undefined : new Date().toISOString(),
    achievedManually: manual || undefined,
  };
  saveTarget(updated);
  return updated;
}

function daysSince(iso: string): number {
  try {
    return Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
  } catch {
    return 0;
  }
}

export function isTargetPriceMet(
  target: PriceTarget,
  currentValue: number,
): boolean {
  if (target.targetType === "sell") {
    return currentValue >= target.targetPrice;
  }
  return currentValue <= target.targetPrice;
}

function progressPercentForTarget(
  target: PriceTarget,
  currentValue: number,
): number {
  if (target.targetType === "sell") {
    if (target.targetPrice <= 0) return 0;
    return Math.min(100, Math.max(0, (currentValue / target.targetPrice) * 100));
  }

  const start = target.priceAtCreation;
  const goal = target.targetPrice;
  if (start <= goal) {
    return currentValue <= goal ? 100 : 0;
  }
  const totalDrop = start - goal;
  const progressDrop = start - currentValue;
  return Math.min(100, Math.max(0, (progressDrop / totalDrop) * 100));
}

function remainingAmountForTarget(
  target: PriceTarget,
  currentValue: number,
): number {
  if (target.targetType === "sell") {
    return Math.max(0, target.targetPrice - currentValue);
  }
  return Math.max(0, currentValue - target.targetPrice);
}

function monthlyRateTowardTarget(
  target: PriceTarget,
  currentValue: number,
): number {
  const days = daysSince(target.dateCreated);
  const months = Math.max(days / 30.44, 1 / 30.44);
  const start = target.priceAtCreation;
  if (start <= 0) return 0;

  if (target.targetType === "sell") {
    const linearMonthly = (currentValue - start) / months;
    return linearMonthly / start;
  }

  const linearMonthly = (start - currentValue) / months;
  return linearMonthly / start;
}

function estimateMonthsToTarget(
  target: PriceTarget,
  currentValue: number,
): { months: number | null; label: string } {
  if (isTargetPriceMet(target, currentValue)) {
    return { months: 0, label: "Target reached" };
  }

  const days = daysSince(target.dateCreated);
  const monthsElapsed = Math.max(days / 30.44, 1 / 30.44);
  const start = target.priceAtCreation;

  if (target.targetType === "sell") {
    const monthlyChange = (currentValue - start) / monthsElapsed;
    if (monthlyChange <= 0) {
      return {
        months: null,
        label: "N/A — price not moving toward target",
      };
    }
    const remaining = target.targetPrice - currentValue;
    return {
      months: Math.ceil(remaining / monthlyChange),
      label: `~${Math.ceil(remaining / monthlyChange)} months`,
    };
  }

  const monthlyDrop = (start - currentValue) / monthsElapsed;
  if (monthlyDrop <= 0) {
    return {
      months: null,
      label: "N/A — price not moving toward target",
    };
  }
  const remaining = currentValue - target.targetPrice;
  return {
    months: Math.ceil(remaining / monthlyDrop),
    label: `~${Math.ceil(remaining / monthlyDrop)} months`,
  };
}

function velocityFromMonthlyRate(rate: number, towardTarget: boolean): TargetVelocity {
  const effectiveRate = towardTarget ? Math.abs(rate) : 0;
  if (effectiveRate <= 0) return "stalled";
  if (effectiveRate > 0.03) return "accelerating";
  if (effectiveRate >= 0.01) return "on-track";
  return "slow";
}

export function calculateProgress(
  target: PriceTarget,
  currentValue: number,
): TargetProgress {
  const progressPercent = progressPercentForTarget(target, currentValue);
  const remainingAmount = remainingAmountForTarget(target, currentValue);
  const changeFromCreation = currentValue - target.priceAtCreation;
  const changePercent =
    target.priceAtCreation > 0
      ? Math.round((changeFromCreation / target.priceAtCreation) * 100)
      : 0;
  const isAchieved = isTargetPriceMet(target, currentValue);
  const isClose = !isAchieved && progressPercent >= 90;
  const monthlyRate = monthlyRateTowardTarget(target, currentValue);
  const movingTowardTarget =
    target.targetType === "sell"
      ? changeFromCreation >= 0
      : changeFromCreation <= 0;
  const velocity = velocityFromMonthlyRate(monthlyRate, movingTowardTarget);
  const estimate = estimateMonthsToTarget(target, currentValue);

  return {
    target: { ...target, currentPrice: currentValue },
    progressPercent: isAchieved ? 100 : Math.round(progressPercent),
    remainingAmount,
    changeFromCreation,
    changePercent,
    estimatedMonthsToTarget: estimate.months,
    estimatedMonthsLabel: estimate.label,
    isAchieved,
    isClose,
    velocity,
    movingTowardTarget,
  };
}

export function resolveCurrentValue(
  target: PriceTarget,
  contexts?: TargetSetContext[],
): number {
  if (contexts) {
    const match = contexts.find(
      (c) =>
        c.setNumber.trim() === target.setNumber.trim() &&
        (!c.condition || c.condition === target.condition),
    );
    if (match) return match.estimatedValue;
  }
  const analysis = analyzeSet(
    target.setNumber,
    target.condition as Condition,
  );
  return analysis?.estimatedValue ?? target.currentPrice;
}

export function checkAchievedTargets(
  sets: Array<SetData & TargetSetContext>,
): PriceTarget[] {
  const contexts: TargetSetContext[] = sets.map((s) => ({
    setNumber: s.setNumber,
    estimatedValue: s.estimatedValue,
    condition: s.condition,
  }));
  return checkAchievedTargetsFromContexts(contexts);
}

export function checkAchievedTargetsFromContexts(
  contexts?: TargetSetContext[],
): PriceTarget[] {
  const newlyAchieved: PriceTarget[] = [];

  for (const target of getActiveTargets()) {
    const currentValue = resolveCurrentValue(target, contexts);
    const achieved = isTargetPriceMet(target, currentValue);

    if (achieved) {
      const updated: PriceTarget = {
        ...target,
        currentPrice: currentValue,
        status: "achieved",
        dateAchieved: new Date().toISOString(),
      };
      saveTarget(updated);
      newlyAchieved.push(updated);
    } else if (target.currentPrice !== currentValue) {
      saveTarget({ ...target, currentPrice: currentValue });
    }
  }

  return newlyAchieved;
}

export function createTarget(input: {
  setNumber: string;
  setName: string;
  theme: string;
  condition: string;
  targetType: TargetType;
  targetPrice: number;
  currentPrice: number;
  notes?: string;
}): PriceTarget {
  const target: PriceTarget = {
    id: generateTargetId(),
    setNumber: input.setNumber.trim(),
    setName: input.setName,
    theme: input.theme,
    condition: input.condition,
    targetType: input.targetType,
    targetPrice: input.targetPrice,
    currentPrice: input.currentPrice,
    priceAtCreation: input.currentPrice,
    dateCreated: new Date().toISOString(),
    status: "active",
    notes: input.notes,
  };
  saveTarget(target);
  return target;
}

export function updateTarget(
  id: string,
  patch: Partial<Pick<PriceTarget, "targetPrice" | "notes" | "targetType">>,
): PriceTarget | null {
  const existing = getTargetById(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  saveTarget(updated);
  return updated;
}

export function getClosestActiveTarget(): {
  target: PriceTarget;
  progress: TargetProgress;
} | null {
  let closest: { target: PriceTarget; progress: TargetProgress } | null = null;

  for (const target of getActiveTargets()) {
    const currentValue = resolveCurrentValue(target);
    const progress = calculateProgress(target, currentValue);
    if (
      !closest ||
      progress.progressPercent > closest.progress.progressPercent
    ) {
      closest = { target, progress };
    }
  }

  return closest;
}

export function getActiveTargetsWithProgress(): TargetProgress[] {
  return getActiveTargets()
    .map((target) => calculateProgress(target, resolveCurrentValue(target)))
    .sort((a, b) => b.progressPercent - a.progressPercent);
}

export function formatTargetDate(iso: string): string {
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

export const VELOCITY_COPY: Record<
  TargetVelocity,
  { emoji: string; label: string; description: string; className: string }
> = {
  accelerating: {
    emoji: "🚀",
    label: "Accelerating",
    description: "Price moving faster than expected",
    className: "text-emerald-400",
  },
  "on-track": {
    emoji: "✦",
    label: "On Track",
    description: "Progressing steadily toward target",
    className: "text-blue-400",
  },
  slow: {
    emoji: "🐢",
    label: "Slow",
    description: "Progress slower than expected — monitor closely",
    className: "text-amber-400",
  },
  stalled: {
    emoji: "⏸",
    label: "Stalled",
    description: "Price movement has slowed — review your target",
    className: "text-zinc-500",
  },
};

export function buildTargetContextsFromPortfolioAndWatchlist(): TargetSetContext[] {
  const contexts: TargetSetContext[] = [];
  const seen = new Set<string>();

  for (const target of getActiveTargets()) {
    const key = `${target.setNumber}:${target.condition}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const analysis = analyzeSet(target.setNumber, target.condition as Condition);
    if (analysis) {
      contexts.push({
        setNumber: target.setNumber,
        estimatedValue: analysis.estimatedValue,
        condition: target.condition,
      });
    }
  }

  return contexts;
}
