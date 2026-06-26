import type {
  PortfolioCondition,
  Recommendation,
} from "@/lib/analyze-types";
import {
  DEFAULT_INTENT_TAG,
  getIntentOption,
  portfolioConditionLabel,
  type IntentTag,
} from "@/lib/portfolio-intent";

export const PORTFOLIO_KEY = "lego-portfolio";

import { formatAUD } from "@/src/lib/currency";

export {
  audToUsd,
  formatAUD as formatAud,
  usdToAud,
} from "@/src/lib/currency";

export interface PortfolioCopy {
  id: string;
  condition: PortfolioCondition;
  purchasePrice: number;
  intent: string;
  intentTag: IntentTag;
  notes: string;
  dateAdded: string;
}

function normalizeCopy(copy: Partial<PortfolioCopy> & Pick<PortfolioCopy, "id" | "condition" | "purchasePrice" | "dateAdded">): PortfolioCopy {
  const tag = (copy.intentTag ?? DEFAULT_INTENT_TAG) as IntentTag;
  const option = getIntentOption(tag);
  return {
    id: copy.id,
    condition: copy.condition,
    purchasePrice: copy.purchasePrice,
    dateAdded: copy.dateAdded,
    intentTag: tag,
    intent: copy.intent ?? option.label,
    notes: copy.notes ?? "",
  };
}

export interface PortfolioItem {
  setNumber: string;
  name: string;
  theme: string;
  condition: PortfolioCondition;
  purchasePrice: number;
  estimatedValue: number;
  suggestedListPrice: number;
  recommendation: Recommendation;
  quantity: number;
  totalPaid: number;
  totalEstimatedValue: number;
  copies: PortfolioCopy[];
}

export function portfolioItemId(setNumber: string): string {
  return setNumber.trim();
}

function genCopyId(): string {
  return `copy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function estimateCopyValueAud(
  _setNumber: string,
  _condition: PortfolioCondition,
  fallbackPerUnit: number,
): number {
  return fallbackPerUnit;
}

export function syncItemTotals(item: PortfolioItem): PortfolioItem {
  const copies =
    item.copies?.length > 0
      ? item.copies.map((c) => normalizeCopy(c))
      : [
          normalizeCopy({
            id: genCopyId(),
            condition: item.condition,
            purchasePrice: item.purchasePrice,
            dateAdded: new Date().toISOString(),
          }),
        ];

  const quantity = copies.length;
  const totalPaid = copies.reduce((sum, c) => sum + c.purchasePrice, 0);
  const totalEstimatedValue = copies.reduce(
    (sum, c) =>
      sum + estimateCopyValueAud(item.setNumber, c.condition, item.estimatedValue),
    0,
  );
  const purchasePrice =
    quantity > 0 ? Math.round((totalPaid / quantity) * 100) / 100 : 0;
  const latest = copies[copies.length - 1];

  return {
    ...item,
    copies,
    quantity,
    totalPaid,
    totalEstimatedValue,
    purchasePrice,
    condition: latest.condition,
  };
}

type LegacyPortfolioRow = PortfolioItem & {
  copyId?: string;
  dateAdded?: string;
  intent?: string;
  intentTag?: IntentTag;
  notes?: string;
};

function migrateLegacyItems(raw: LegacyPortfolioRow[]): PortfolioItem[] {
  const bySet = new Map<string, LegacyPortfolioRow[]>();
  for (const row of raw) {
    if (!row?.setNumber) continue;
    const list = bySet.get(row.setNumber) ?? [];
    list.push(row);
    bySet.set(row.setNumber, list);
  }

  return [...bySet.entries()].map(([setNumber, rows]) => {
    const latest = rows[rows.length - 1];
    if (latest.quantity && latest.copies?.length) {
      return syncItemTotals(latest);
    }

    const copies: PortfolioCopy[] = [];
    for (const row of rows) {
      if (row.copies?.length) {
        for (const c of row.copies) {
          copies.push(
            normalizeCopy({
              id: c.id ?? genCopyId(),
              condition: c.condition,
              purchasePrice: c.purchasePrice,
              dateAdded: c.dateAdded ?? new Date().toISOString(),
              intent: c.intent,
              intentTag: c.intentTag,
              notes: c.notes,
            }),
          );
        }
      } else {
        copies.push(
          normalizeCopy({
            id: row.copyId ?? genCopyId(),
            condition: row.condition,
            purchasePrice: row.purchasePrice,
            dateAdded: row.dateAdded ?? new Date().toISOString(),
            intent: row.intent,
            intentTag: row.intentTag as IntentTag | undefined,
            notes: row.notes,
          }),
        );
      }
    }

    return syncItemTotals({
      setNumber,
      name: latest.name,
      theme: latest.theme,
      condition: latest.condition,
      purchasePrice: latest.purchasePrice,
      estimatedValue: latest.estimatedValue,
      suggestedListPrice: latest.suggestedListPrice,
      recommendation: latest.recommendation,
      quantity: copies.length,
      totalPaid: 0,
      totalEstimatedValue: 0,
      copies,
    });
  });
}

export function loadPortfolio(): PortfolioItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyPortfolioRow[];
    if (!Array.isArray(parsed)) return [];
    return migrateLegacyItems(parsed).map(syncItemTotals);
  } catch {
    return [];
  }
}

export function savePortfolio(items: PortfolioItem[]): void {
  localStorage.setItem(
    PORTFOLIO_KEY,
    JSON.stringify(items.map(syncItemTotals)),
  );
}

export function getPortfolioItem(
  items: PortfolioItem[],
  setNumber: string,
): PortfolioItem | undefined {
  return items.find((i) => i.setNumber === setNumber.trim());
}

export function isInPortfolio(
  items: PortfolioItem[],
  setNumber: string,
  condition?: string,
): boolean {
  const item = getPortfolioItem(items, setNumber);
  if (!item) return false;
  if (!condition) return true;
  return item.copies.some((c) => c.condition === condition);
}

export function getCopyCountForSet(
  items: PortfolioItem[],
  setNumber: string,
): number {
  return getPortfolioItem(items, setNumber)?.quantity ?? 0;
}

export function getTotalCopyCount(items: PortfolioItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function countUniqueSets(items: PortfolioItem[]): number {
  return items.length;
}

export interface ConcentrationWarning {
  setNumber: string;
  name: string;
  percent: number;
  totalEstimatedValue: number;
}

export function getConcentrationWarnings(
  items: PortfolioItem[],
): ConcentrationWarning[] {
  const totalEstimated = items.reduce((s, i) => s + i.totalEstimatedValue, 0);
  if (totalEstimated <= 0) return [];

  return items
    .map((item) => ({
      setNumber: item.setNumber,
      name: item.name,
      percent: Math.round((item.totalEstimatedValue / totalEstimated) * 100),
      totalEstimatedValue: item.totalEstimatedValue,
    }))
    .filter((w) => w.percent > 30)
    .sort((a, b) => b.percent - a.percent);
}

export interface PortfolioSetGroup {
  setNumber: string;
  name: string;
  theme: string;
  item: PortfolioItem;
  copyCount: number;
  totalPaid: number;
  totalEstimated: number;
  totalProfit: number;
  percentGain: number;
}

export function groupPortfolioBySetNumber(
  items: PortfolioItem[],
): PortfolioSetGroup[] {
  return items.map((item) => {
    const totalProfit = item.totalEstimatedValue - item.totalPaid;
    const percentGain =
      item.totalPaid > 0
        ? Math.round((totalProfit / item.totalPaid) * 100)
        : itemPercentGain(item);
    return {
      setNumber: item.setNumber,
      name: item.name,
      theme: item.theme,
      item,
      copyCount: item.quantity,
      totalPaid: item.totalPaid,
      totalEstimated: item.totalEstimatedValue,
      totalProfit,
      percentGain,
    };
  });
}

export interface GroupedSetPerformance {
  setNumber: string;
  name: string;
  theme: string;
  copyCount: number;
  totalPaid: number;
  totalEstimated: number;
  profitDollars: number;
  perUnitProfit: number;
  percentGain: number;
  label: PerformanceLabel;
  representative: PortfolioItem;
}

export function computeGroupedSetPerformances(
  items: PortfolioItem[],
): GroupedSetPerformance[] {
  return items.map((item) => {
    const profitDollars = item.totalEstimatedValue - item.totalPaid;
    const perUnitProfit = itemProfitPerUnit(item);
    return {
      setNumber: item.setNumber,
      name: item.name,
      theme: item.theme,
      copyCount: item.quantity,
      totalPaid: item.totalPaid,
      totalEstimated: item.totalEstimatedValue,
      profitDollars,
      perUnitProfit,
      percentGain: itemPercentGain(item),
      label: profitDollars >= 0 ? "Gain" : "Loss",
      representative: item,
    };
  });
}

export function getDuplicateSetGroups(
  groups: PortfolioSetGroup[],
): PortfolioSetGroup[] {
  return groups.filter((g) => g.copyCount > 1);
}

function conditionLabelExport(condition: PortfolioCondition): string {
  return portfolioConditionLabel(condition);
}

export function formatPortfolioExportSummary(items: PortfolioItem[]): string {
  const lines = items.map((item) => {
    if (item.quantity === 1) {
      const c = item.copies[0];
      return `${item.setNumber} ${item.name} — ${conditionLabelExport(c.condition)} ${formatAUD(c.purchasePrice)} — Est. ${formatAUD(item.totalEstimatedValue)}`;
    }
    const copyParts = item.copies
      .map(
        (c) =>
          `${conditionLabelExport(c.condition)} ${formatAUD(c.purchasePrice)} [${c.intent}]`,
      )
      .join(" + ");
    return `${item.setNumber} ${item.name} x${item.quantity} — ${copyParts} — Est. Value ${formatAUD(item.totalEstimatedValue)}`;
  });
  const unique = countUniqueSets(items);
  const totalCopies = getTotalCopyCount(items);
  return [
    `Portfolio (${unique} sets, ${totalCopies} copies)`,
    ...lines,
  ].join("\n");
}

export interface AddToPortfolioInput {
  setNumber: string;
  name: string;
  theme: string;
  condition: PortfolioCondition;
  purchasePrice: number;
  estimatedValue: number;
  suggestedListPrice: number;
  recommendation: Recommendation;
  quantity?: number;
  intentTag?: IntentTag;
  notes?: string;
}

function buildCopy(
  condition: PortfolioCondition,
  purchasePrice: number,
  intentTag: IntentTag = DEFAULT_INTENT_TAG,
  notes = "",
): PortfolioCopy {
  const option = getIntentOption(intentTag);
  return normalizeCopy({
    id: genCopyId(),
    condition,
    purchasePrice,
    dateAdded: new Date().toISOString(),
    intentTag,
    intent: option.label,
    notes,
  });
}

export function addToPortfolio(input: AddToPortfolioInput): PortfolioItem[] {
  const items = loadPortfolio();
  const qty = Math.min(99, Math.max(1, input.quantity ?? 1));
  const tag = input.intentTag ?? DEFAULT_INTENT_TAG;
  const newCopies: PortfolioCopy[] = Array.from({ length: qty }, () =>
    buildCopy(input.condition, input.purchasePrice, tag, input.notes ?? ""),
  );

  const existing = getPortfolioItem(items, input.setNumber);
  if (existing) {
    const merged = syncItemTotals({
      ...existing,
      estimatedValue: input.estimatedValue,
      suggestedListPrice: input.suggestedListPrice,
      recommendation: input.recommendation,
      copies: [...existing.copies, ...newCopies],
    });
    const next = items.map((i) =>
      i.setNumber === input.setNumber ? merged : i,
    );
    savePortfolio(next);
    return next;
  }

  const created = syncItemTotals({
    setNumber: input.setNumber,
    name: input.name,
    theme: input.theme,
    condition: input.condition,
    purchasePrice: input.purchasePrice,
    estimatedValue: input.estimatedValue,
    suggestedListPrice: input.suggestedListPrice,
    recommendation: input.recommendation,
    quantity: qty,
    totalPaid: 0,
    totalEstimatedValue: 0,
    copies: newCopies,
  });

  const next = [...items, created];
  savePortfolio(next);
  return next;
}

export function addPortfolioCopy(input: {
  setNumber: string;
  name: string;
  theme: string;
  condition: PortfolioCondition;
  purchasePrice: number;
  estimatedValue: number;
  suggestedListPrice: number;
  recommendation: Recommendation;
  intentTag: IntentTag;
  notes?: string;
}): PortfolioItem[] {
  return addToPortfolio({
    ...input,
    quantity: 1,
    notes: input.notes,
  });
}

export function incrementPortfolioCopy(
  setNumber: string,
  condition?: PortfolioCondition,
  purchasePrice?: number,
  intentTag: IntentTag = DEFAULT_INTENT_TAG,
): PortfolioItem[] {
  const items = loadPortfolio();
  const item = getPortfolioItem(items, setNumber);
  if (!item) return items;

  const last =
    [...item.copies]
      .reverse()
      .find((c) => (condition ? c.condition === condition : true)) ??
    item.copies[item.copies.length - 1];

  const merged = syncItemTotals({
    ...item,
    copies: [
      ...item.copies,
      buildCopy(
        condition ?? last.condition,
        purchasePrice ?? last.purchasePrice,
        intentTag,
        last.notes,
      ),
    ],
  });

  const next = items.map((i) => (i.setNumber === setNumber ? merged : i));
  savePortfolio(next);
  return next;
}

export function decrementPortfolioCopy(setNumber: string): PortfolioItem[] {
  const items = loadPortfolio();
  const item = getPortfolioItem(items, setNumber);
  if (!item || item.copies.length === 0) return items;

  if (item.copies.length === 1) {
    return removeFromPortfolio(setNumber);
  }

  const merged = syncItemTotals({
    ...item,
    copies: item.copies.slice(0, -1),
  });
  const next = items.map((i) => (i.setNumber === setNumber ? merged : i));
  savePortfolio(next);
  return next;
}

export function removePortfolioCopy(
  setNumber: string,
  copyId: string,
): PortfolioItem[] {
  const items = loadPortfolio();
  const item = getPortfolioItem(items, setNumber);
  if (!item) return items;

  const copies = item.copies.filter((c) => c.id !== copyId);
  if (copies.length === 0) {
    return removeFromPortfolio(setNumber);
  }

  const merged = syncItemTotals({ ...item, copies });
  const next = items.map((i) => (i.setNumber === setNumber ? merged : i));
  savePortfolio(next);
  return next;
}

export function updatePortfolioCopy(
  setNumber: string,
  copyId: string,
  updates: Partial<
    Pick<
      PortfolioCopy,
      "condition" | "purchasePrice" | "intentTag" | "intent" | "notes"
    >
  >,
): PortfolioItem[] {
  const items = loadPortfolio();
  const item = getPortfolioItem(items, setNumber);
  if (!item) return items;

  const merged = syncItemTotals({
    ...item,
    copies: item.copies.map((c) => {
      if (c.id !== copyId) return c;
      const merged = { ...c, ...updates };
      if (updates.intentTag) {
        merged.intent = getIntentOption(updates.intentTag).label;
      }
      return normalizeCopy(merged);
    }),
  });
  const next = items.map((i) => (i.setNumber === setNumber ? merged : i));
  savePortfolio(next);
  return next;
}

export function removeFromPortfolio(setNumber: string): PortfolioItem[] {
  const next = loadPortfolio().filter((i) => i.setNumber !== setNumber.trim());
  savePortfolio(next);
  return next;
}

export type HealthLabel =
  | "Excellent"
  | "Good"
  | "Fair"
  | "Needs Attention";

export interface SetPerformance {
  item: PortfolioItem;
  percentGain: number;
}

export interface PortfolioMetrics {
  totalSets: number;
  uniqueSetCount: number;
  totalCopyCount: number;
  avgCopiesPerSet: number;
  mostHeldSet: { name: string; setNumber: string; quantity: number } | null;
  totalPaid: number;
  totalEstimated: number;
  totalProfit: number;
  percentGain: number;
  sellCount: number;
  holdCount: number;
  themeBreakdown: { theme: string; count: number }[];
  bestPerforming: SetPerformance | null;
  worstPerforming: SetPerformance | null;
  healthScore: number;
  healthLabel: HealthLabel;
  concentrationWarnings: ConcentrationWarning[];
}

export function itemPercentGain(item: PortfolioItem): number {
  if (item.purchasePrice <= 0) return 0;
  return Math.round(
    ((item.estimatedValue - item.purchasePrice) / item.purchasePrice) * 100,
  );
}

export function itemProfitPerUnit(item: PortfolioItem): number {
  return item.estimatedValue - item.purchasePrice;
}

export function itemProfitDollars(item: PortfolioItem): number {
  return item.totalEstimatedValue - item.totalPaid;
}

export type PerformanceLabel = "Gain" | "Loss";

export interface PortfolioSetPerformance {
  item: PortfolioItem;
  profitDollars: number;
  perUnitProfit: number;
  percentGain: number;
  label: PerformanceLabel;
}

export function computeSetPerformances(
  items: PortfolioItem[],
): PortfolioSetPerformance[] {
  return items.map((item) => {
    const profitDollars = itemProfitDollars(item);
    return {
      item,
      profitDollars,
      perUnitProfit: itemProfitPerUnit(item),
      percentGain: itemPercentGain(item),
      label: profitDollars >= 0 ? "Gain" : "Loss",
    };
  });
}

export function sortPerformancesByPercent(
  performances: PortfolioSetPerformance[],
  descending = true,
): PortfolioSetPerformance[] {
  return [...performances].sort((a, b) =>
    descending ? b.percentGain - a.percentGain : a.percentGain - b.percentGain,
  );
}

export function sortPerformancesByDollars(
  performances: PortfolioSetPerformance[],
  descending = true,
): PortfolioSetPerformance[] {
  return [...performances].sort((a, b) =>
    descending
      ? b.profitDollars - a.profitDollars
      : a.profitDollars - b.profitDollars,
  );
}

export function computeHealthScore(
  items: PortfolioItem[],
  totalProfit: number,
  bestPercentGain: number,
): number {
  if (items.length === 0) return 0;

  let score = 0;
  if (totalProfit > 0) score += 3;

  const holdCount = items.filter((i) => i.recommendation === "HOLD").length;
  if (holdCount / items.length > 0.5) score += 2;

  const uniqueThemes = new Set(items.map((i) => i.theme)).size;
  if (uniqueThemes >= 3) score += 2;

  if (bestPercentGain > 30) score += 2;

  if (items.length >= 5) score += 1;

  return Math.min(score, 10);
}

export function getHealthLabel(score: number): HealthLabel {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Good";
  if (score >= 4) return "Fair";
  return "Needs Attention";
}

export function computePortfolioMetrics(items: PortfolioItem[]): PortfolioMetrics {
  const synced = items.map(syncItemTotals);
  const uniqueSetCount = synced.length;
  const totalCopyCount = getTotalCopyCount(synced);
  const totalPaid = synced.reduce((sum, i) => sum + i.totalPaid, 0);
  const totalEstimated = synced.reduce(
    (sum, i) => sum + i.totalEstimatedValue,
    0,
  );
  const totalProfit = totalEstimated - totalPaid;
  const percentGain =
    totalPaid > 0 ? Math.round((totalProfit / totalPaid) * 100) : 0;

  const sellCount = synced.filter((i) => i.recommendation === "SELL").length;
  const holdCount = synced.filter((i) => i.recommendation === "HOLD").length;

  const themeMap = new Map<string, number>();
  for (const item of synced) {
    themeMap.set(item.theme, (themeMap.get(item.theme) ?? 0) + item.quantity);
  }
  const themeBreakdown = [...themeMap.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);

  const performances: SetPerformance[] = synced.map((item) => ({
    item,
    percentGain: itemPercentGain(item),
  }));

  const bestPerforming =
    performances.length > 0
      ? performances.reduce((best, curr) =>
          curr.percentGain > best.percentGain ? curr : best,
        )
      : null;

  const worstPerforming =
    performances.length > 0
      ? performances.reduce((worst, curr) =>
          curr.percentGain < worst.percentGain ? curr : worst,
        )
      : null;

  const mostHeld = synced.reduce<PortfolioItem | null>(
    (best, curr) =>
      !best || curr.quantity > best.quantity ? curr : best,
    null,
  );

  const bestPercentGain = bestPerforming?.percentGain ?? 0;
  const healthScore = computeHealthScore(synced, totalProfit, bestPercentGain);
  const healthLabel = getHealthLabel(healthScore);

  return {
    totalSets: uniqueSetCount,
    uniqueSetCount,
    totalCopyCount,
    avgCopiesPerSet:
      uniqueSetCount > 0
        ? Math.round((totalCopyCount / uniqueSetCount) * 10) / 10
        : 0,
    mostHeldSet: mostHeld
      ? {
          name: mostHeld.name,
          setNumber: mostHeld.setNumber,
          quantity: mostHeld.quantity,
        }
      : null,
    totalPaid,
    totalEstimated,
    totalProfit,
    percentGain,
    sellCount,
    holdCount,
    themeBreakdown,
    bestPerforming,
    worstPerforming,
    healthScore,
    healthLabel,
    concentrationWarnings: getConcentrationWarnings(synced),
  };
}

export function sortGroupedPerformancesByPercent(
  performances: GroupedSetPerformance[],
  descending = true,
): GroupedSetPerformance[] {
  return [...performances].sort((a, b) =>
    descending ? b.percentGain - a.percentGain : a.percentGain - b.percentGain,
  );
}

export function sortGroupedPerformancesByDollars(
  performances: GroupedSetPerformance[],
  descending = true,
): GroupedSetPerformance[] {
  return [...performances].sort((a, b) =>
    descending
      ? b.profitDollars - a.profitDollars
      : a.profitDollars - b.profitDollars,
  );
}

/** @deprecated Use getCopyCountForSet */
export function getCopiesBySetNumber(
  items: PortfolioItem[],
  setNumber: string,
): PortfolioItem[] {
  const item = getPortfolioItem(items, setNumber);
  return item ? [item] : [];
}
