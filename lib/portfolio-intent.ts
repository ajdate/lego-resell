import type { PortfolioCondition } from "@/lib/analyze";
import {
  estimateCopyValueAud,
  formatAud,
  type PortfolioCopy,
  type PortfolioItem,
} from "@/lib/portfolio";

export type IntentTag =
  | "flip-soon"
  | "hold-retirement"
  | "hold-long"
  | "personal"
  | "resale-soon"
  | "undecided";

export interface IntentOption {
  tag: IntentTag;
  label: string;
  className: string;
}

export const INTENT_OPTIONS: IntentOption[] = [
  {
    tag: "flip-soon",
    label: "Flip Soon",
    className:
      "border-amber-500/30 bg-amber-500/20 text-amber-400",
  },
  {
    tag: "hold-retirement",
    label: "Hold Until Retirement",
    className: "border-blue-500/30 bg-blue-500/20 text-blue-400",
  },
  {
    tag: "hold-long",
    label: "Long-term Investment",
    className: "border-purple-500/30 bg-purple-500/20 text-purple-400",
  },
  {
    tag: "personal",
    label: "Personal Collection",
    className: "border-green-500/30 bg-green-500/20 text-green-400",
  },
  {
    tag: "resale-soon",
    label: "Marketplace Resale",
    className: "border-orange-500/30 bg-orange-500/20 text-orange-400",
  },
  {
    tag: "undecided",
    label: "Undecided",
    className: "border-white/20 bg-white/10 text-white/40",
  },
];

export const DEFAULT_INTENT_TAG: IntentTag = "undecided";

export function getIntentOption(tag: IntentTag | undefined): IntentOption {
  return (
    INTENT_OPTIONS.find((o) => o.tag === tag) ??
    INTENT_OPTIONS.find((o) => o.tag === DEFAULT_INTENT_TAG)!
  );
}

export const PORTFOLIO_CONDITIONS: {
  value: PortfolioCondition;
  label: string;
  hint: string;
}[] = [
  { value: "sealed", label: "Sealed", hint: "Factory sealed box" },
  { value: "complete", label: "Complete", hint: "Built, all parts & instructions" },
  { value: "incomplete", label: "Incomplete", hint: "Missing pieces or box" },
  {
    value: "damaged-box",
    label: "Damaged box",
    hint: "Sealed but box damage — ~60% of sealed value",
  },
];

export function portfolioConditionLabel(condition: PortfolioCondition): string {
  const row = PORTFOLIO_CONDITIONS.find((c) => c.value === condition);
  if (row) return row.label;
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

const EXIT_INTENTS: IntentTag[] = ["flip-soon", "resale-soon"];
const HOLD_INTENTS: IntentTag[] = ["hold-long", "hold-retirement", "personal"];

export function copyEstimatedValueAud(
  item: PortfolioItem,
  copy: PortfolioCopy,
): number {
  return estimateCopyValueAud(
    item.setNumber,
    copy.condition,
    item.estimatedValue,
  );
}

export function copyProfitAud(item: PortfolioItem, copy: PortfolioCopy): number {
  return copyEstimatedValueAud(item, copy) - copy.purchasePrice;
}

export function copyProfitPercent(
  item: PortfolioItem,
  copy: PortfolioCopy,
): number {
  if (copy.purchasePrice <= 0) return 0;
  return Math.round(
    (copyProfitAud(item, copy) / copy.purchasePrice) * 100,
  );
}

export function formatIntentBreakdown(copies: PortfolioCopy[]): string {
  const counts = new Map<IntentTag, number>();
  for (const copy of copies) {
    const tag = copy.intentTag ?? DEFAULT_INTENT_TAG;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => {
      const label = getIntentOption(tag).label;
      const short =
        tag === "hold-long"
          ? "Hold Long"
          : tag === "hold-retirement"
            ? "Hold Retirement"
            : tag === "flip-soon"
              ? "Flip Soon"
              : tag === "resale-soon"
                ? "Resale"
                : tag === "personal"
                  ? "Personal"
                  : "Undecided";
      return `${count}x ${short}`;
    })
    .join(" · ");
}

export function hasMixedIntentStrategy(copies: PortfolioCopy[]): boolean {
  const tags = new Set(
    copies.map((c) => c.intentTag ?? DEFAULT_INTENT_TAG),
  );
  const hasExit = [...tags].some((t) => EXIT_INTENTS.includes(t));
  const hasHold = [...tags].some((t) => HOLD_INTENTS.includes(t));
  const hasUndecided = tags.has("undecided");
  return (hasExit && hasHold) || (hasUndecided && tags.size > 1);
}

export type IntentFilterKey = IntentTag | "all";

export const INTENT_FILTER_OPTIONS: { key: IntentFilterKey; label: string }[] =
  [
    { key: "all", label: "All" },
    { key: "flip-soon", label: "Flip Soon" },
    { key: "hold-retirement", label: "Hold Until Retirement" },
    { key: "hold-long", label: "Long-term" },
    { key: "personal", label: "Personal" },
    { key: "resale-soon", label: "Resale" },
    { key: "undecided", label: "Undecided" },
  ];

export function filterPortfolioByIntent(
  items: PortfolioItem[],
  filter: IntentFilterKey,
): PortfolioItem[] {
  if (filter === "all") return items;
  return items
    .map((item) => {
      const copies = item.copies.filter(
        (c) => (c.intentTag ?? DEFAULT_INTENT_TAG) === filter,
      );
      if (copies.length === 0) return null;
      return { ...item, copies };
    })
    .filter((item): item is PortfolioItem => item !== null)
    .map((item) => ({
      ...item,
      quantity: item.copies.length,
      totalPaid: item.copies.reduce((s, c) => s + c.purchasePrice, 0),
      totalEstimatedValue: item.copies.reduce(
        (s, c) => s + copyEstimatedValueAud(item, c),
        0,
      ),
    }));
}

export interface IntentAggregateRow {
  tag: IntentTag;
  label: string;
  className: string;
  copyCount: number;
  totalValueAud: number;
}

export interface IntentDashboardSummary {
  rows: IntentAggregateRow[];
  totalCopies: number;
  undecidedCount: number;
}

export function computeIntentDashboard(
  items: PortfolioItem[],
): IntentDashboardSummary {
  const valueByTag = new Map<IntentTag, number>();
  const countByTag = new Map<IntentTag, number>();
  let totalCopies = 0;

  for (const item of items) {
    for (const copy of item.copies) {
      totalCopies += 1;
      const tag = copy.intentTag ?? DEFAULT_INTENT_TAG;
      countByTag.set(tag, (countByTag.get(tag) ?? 0) + 1);
      valueByTag.set(
        tag,
        (valueByTag.get(tag) ?? 0) + copyEstimatedValueAud(item, copy),
      );
    }
  }

  const rows: IntentAggregateRow[] = INTENT_OPTIONS.map((opt) => ({
    tag: opt.tag,
    label: opt.label,
    className: opt.className,
    copyCount: countByTag.get(opt.tag) ?? 0,
    totalValueAud: valueByTag.get(opt.tag) ?? 0,
  })).filter((r) => r.copyCount > 0);

  return {
    rows,
    totalCopies,
    undecidedCount: countByTag.get("undecided") ?? 0,
  };
}

export function formatPortfolioIntentSummary(
  setNumber: string,
  items: PortfolioItem[],
): string | null {
  const item = items.find((i) => i.setNumber === setNumber);
  if (!item || item.copies.length === 0) return null;
  return `In Portfolio: ${formatIntentBreakdown(item.copies)}`;
}

export function formatIntentValueLine(row: IntentAggregateRow): string {
  return `${row.copyCount} ${row.copyCount === 1 ? "copy" : "copies"}, ${formatAud(row.totalValueAud)} combined value`;
}
