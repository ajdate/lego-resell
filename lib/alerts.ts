import type { MarketOpportunityEntry } from "@/lib/market-opportunities";
import {
  estimateCopyValueAud,
  loadPortfolio,
  type PortfolioItem,
} from "@/lib/portfolio";
import { getTierForSetNumber } from "@/lib/retiring-soon";
import {
  getActiveTargets,
  isTargetPriceMet,
  resolveCurrentValue,
  saveTarget,
} from "@/lib/priceTargets";

export const DISMISSED_ALERTS_KEY = "lego-dismissed-alerts";
export const READ_ALERTS_KEY = "lego-read-alerts";

export type AlertCategory =
  | "retirement"
  | "price-movement"
  | "price-target"
  | "strategy"
  | "opportunities"
  | "action-required";

export type AlertFilterKey =
  | "all"
  | "retirement"
  | "price-movement"
  | "price-target"
  | "strategy"
  | "opportunities"
  | "action-required";

export type AlertUrgency = "high" | "medium" | "low";

export interface Alert {
  id: string;
  category: AlertCategory;
  typeLabel: string;
  icon: string;
  setNumber: string;
  setName: string;
  message: string;
  urgency: AlertUrgency;
  accentClass: string;
}

export const ALERT_FILTER_OPTIONS: { key: AlertFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "retirement", label: "Retirement" },
  { key: "price-movement", label: "Price Movement" },
  { key: "price-target", label: "Price Targets" },
  { key: "strategy", label: "Strategy" },
  { key: "opportunities", label: "Opportunities" },
  { key: "action-required", label: "Action Required" },
];

function readIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function loadDismissedAlertIds(): Set<string> {
  return readIdSet(DISMISSED_ALERTS_KEY);
}

export function loadReadAlertIds(): Set<string> {
  return readIdSet(READ_ALERTS_KEY);
}

export function dismissAlert(id: string): void {
  const dismissed = loadDismissedAlertIds();
  dismissed.add(id);
  writeIdSet(DISMISSED_ALERTS_KEY, dismissed);
}

export function markAlertRead(id: string): void {
  const read = loadReadAlertIds();
  read.add(id);
  writeIdSet(READ_ALERTS_KEY, read);
}

export function markAllAlertsRead(ids: string[]): void {
  const read = loadReadAlertIds();
  for (const id of ids) read.add(id);
  writeIdSet(READ_ALERTS_KEY, read);
}

/** One alert per setNumber + category + typeLabel (keeps the last occurrence). */
export function deduplicateAlerts(alerts: Alert[]): Alert[] {
  const result: Alert[] = [];
  const indexByKey = new Map<string, number>();

  for (const alert of alerts) {
    if (!alert.setNumber) {
      result.push(alert);
      continue;
    }
    const key = `${alert.setNumber}|${alert.category}|${alert.typeLabel}`;
    const existing = indexByKey.get(key);
    if (existing !== undefined) {
      result[existing] = alert;
    } else {
      indexByKey.set(key, result.length);
      result.push(alert);
    }
  }

  return result;
}

function formatSetLabel(name: string, copyCount: number): string {
  if (copyCount <= 1) return name;
  return `${name} (${copyCount} copies)`;
}

export function collectMonitoredSetNumbers(): Map<
  string,
  { name: string; source: "portfolio" | "watchlist" }
> {
  const map = new Map<string, { name: string; source: "portfolio" | "watchlist" }>();

  for (const item of loadPortfolio()) {
    map.set(item.setNumber, { name: item.name, source: "portfolio" });
  }
  return map;
}

function retirementUrgency(setNumber: string): AlertUrgency {
  const tier = getTierForSetNumber(setNumber);
  if (tier === "imminent") return "high";
  if (tier === "soon") return "medium";
  return "low";
}

function generateRetirementAlerts(
  monitored: Map<string, { name: string }>,
): Alert[] {
  const alerts: Alert[] = [];

  for (const [setNumber, { name }] of monitored) {
    if (!getTierForSetNumber(setNumber)) continue;

    const urgency = retirementUrgency(setNumber);
    alerts.push({
      id: `retirement-${setNumber}`,
      category: "retirement",
      typeLabel: "Retirement Watch",
      icon: "⚠️",
      setNumber,
      setName: name,
      message: `⚠️ Retirement Watch — ${name} is showing retirement signals. Stock levels are declining. Review your position.`,
      urgency,
      accentClass: "border-l-amber-500",
    });
  }

  return alerts;
}

function generatePriceMovementAlerts(items: PortfolioItem[]): Alert[] {
  const alerts: Alert[] = [];

  for (const item of items) {
    const copyCount = item.copies.length;
    const label = formatSetLabel(item.name, copyCount);
    let hasStrongGain = false;
    let hasModerateGain = false;
    let hasLoss = false;

    for (const copy of item.copies) {
      const est = estimateCopyValueAud(
        item.setNumber,
        copy.condition,
        item.estimatedValue,
      );
      const paid = copy.purchasePrice;
      if (paid <= 0) continue;

      if (est >= paid * 1.3) hasStrongGain = true;
      else if (est >= paid * 1.15) hasModerateGain = true;
      else if (est < paid * 0.9) hasLoss = true;
    }

    if (hasStrongGain) {
      alerts.push({
        id: `price-strong-${item.setNumber}`,
        category: "price-movement",
        typeLabel: "Strong Gain",
        icon: "🚀",
        setNumber: item.setNumber,
        setName: item.name,
        message: `🚀 Strong Gain — ${label} has gained 30%+ since you bought it. Current market conditions support a premium sale.`,
        urgency: "medium",
        accentClass: "border-l-emerald-500",
      });
    } else if (hasModerateGain) {
      alerts.push({
        id: `price-up-${item.setNumber}`,
        category: "price-movement",
        typeLabel: "Value Up",
        icon: "📈",
        setNumber: item.setNumber,
        setName: item.name,
        message: `📈 Value Up — ${label} is now 15%+ above your purchase price. Consider reviewing your sell strategy.`,
        urgency: "low",
        accentClass: "border-l-emerald-500",
      });
    } else if (hasLoss) {
      alerts.push({
        id: `price-down-${item.setNumber}`,
        category: "price-movement",
        typeLabel: "Value Down",
        icon: "📉",
        setNumber: item.setNumber,
        setName: item.name,
        message: `📉 Value Down — ${label} is below your purchase price. Review condition and pricing strategy before listing.`,
        urgency: "medium",
        accentClass: "border-l-red-500",
      });
    }
  }

  return alerts;
}

function generateStrategyAlerts(items: PortfolioItem[]): Alert[] {
  const alerts: Alert[] = [];

  for (const item of items) {
    const recommendation = item.recommendation;
    const label = formatSetLabel(item.name, item.copies.length);

    const flipSoonCount = item.copies.filter(
      (c) => c.intentTag === "flip-soon",
    ).length;

    if (flipSoonCount > 0 && recommendation === "HOLD") {
      const copyPhrase =
        flipSoonCount === 1
          ? "1 copy marked as Flip Soon"
          : `${flipSoonCount} copies marked as Flip Soon`;
      alerts.push({
        id: `strategy-flip-hold-${item.setNumber}`,
        category: "strategy",
        typeLabel: "Strategy Conflict",
        icon: "⚠️",
        setNumber: item.setNumber,
        setName: item.name,
        message: `⚠️ Strategy Conflict — ${label}: ${copyPhrase}, but current recommendation is HOLD. Review your exit timing.`,
        urgency: "high",
        accentClass: "border-l-amber-500",
      });
    }

  }

  return alerts;
}

function generateOpportunityAlerts(
  portfolioSetNumbers: Set<string>,
  opportunityEntries: MarketOpportunityEntry[],
): Alert[] {
  const entries = opportunityEntries.filter(
    (e) =>
      e.opportunity.opportunityScore >= 80 &&
      portfolioSetNumbers.has(e.set.number),
  );

  return entries.slice(0, 3).map((entry) => ({
    id: `opportunity-${entry.set.number}`,
    category: "opportunities" as const,
    typeLabel: "Opportunity",
    icon: "🔥",
    setNumber: entry.set.number,
    setName: entry.set.name,
    message: `🔥 Opportunity — ${entry.set.name} has an Exceptional opportunity score. Consider adding to watchlist.`,
    urgency: "medium" as AlertUrgency,
    accentClass: "border-l-[#f59e0b]",
  }));
}

function generatePriceTargetAlerts(portfolioSetNumbers: Set<string>): Alert[] {
  const alerts: Alert[] = [];

  for (const target of getActiveTargets()) {
    // Only generate alerts for sets the user is tracking in their portfolio.
    // When the portfolio is empty, this yields no alerts.
    if (!portfolioSetNumbers.has(target.setNumber)) continue;
    const currentValue = resolveCurrentValue(target);
    if (!isTargetPriceMet(target, currentValue)) continue;

    saveTarget({
      ...target,
      currentPrice: currentValue,
      status: "achieved",
      dateAchieved: new Date().toISOString(),
    });

    alerts.push({
      id: `price-target-${target.id}`,
      category: "price-target",
      typeLabel: "Price Target Hit",
      icon: "💰",
      setNumber: target.setNumber,
      setName: target.setName,
      message: `💰 Price Target Hit — ${target.setName} reached your ${target.targetType === "sell" ? "sell" : "buy"} target of $${Math.round(target.targetPrice)} AUD`,
      urgency: "high",
      accentClass: "border-l-emerald-500",
    });
  }

  return alerts;
}

function generateUndecidedAlert(items: PortfolioItem[]): Alert | null {
  let count = 0;
  for (const item of items) {
    count += item.copies.filter((c) => c.intentTag === "undecided").length;
  }
  if (count === 0) return null;

  return {
    id: "undecided-copies",
    category: "action-required",
    typeLabel: "Action Required",
    icon: "📋",
    setNumber: "",
    setName: "Portfolio",
    message: `📋 Action Required — You have ${count} ${count === 1 ? "copy" : "copies"} without a clear intent. Assign a strategy to optimise your portfolio.`,
    urgency: "medium",
    accentClass: "border-l-amber-500",
  };
}

export function generateAllAlerts(options?: {
  opportunityEntries?: MarketOpportunityEntry[];
}): Alert[] {
  const portfolio = loadPortfolio();
  const portfolioSetNumbers = new Set(portfolio.map((i) => i.setNumber));
  const monitored = collectMonitoredSetNumbers();
  const opportunityEntries = options?.opportunityEntries ?? [];

  const alerts: Alert[] = [
    ...generateRetirementAlerts(monitored),
    ...generatePriceMovementAlerts(portfolio),
    ...generatePriceTargetAlerts(portfolioSetNumbers),
    ...generateStrategyAlerts(portfolio),
    ...generateOpportunityAlerts(portfolioSetNumbers, opportunityEntries),
  ];

  const undecided = generateUndecidedAlert(portfolio);
  if (undecided) alerts.push(undecided);

  return deduplicateAlerts(alerts).sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

export function applyAlertState(
  alerts: Alert[],
  dismissed: Set<string>,
  read: Set<string>,
): { alert: Alert; isRead: boolean }[] {
  return alerts
    .filter((a) => !dismissed.has(a.id))
    .map((alert) => ({
      alert,
      isRead: read.has(alert.id),
    }));
}

export function countAlertsByCategory(
  visible: { alert: Alert; isRead: boolean }[],
): {
  unread: number;
  retirement: number;
  priceMovement: number;
  priceTarget: number;
  strategy: number;
  opportunities: number;
  actionRequired: number;
} {
  let unread = 0;
  let retirement = 0;
  let priceMovement = 0;
  let priceTarget = 0;
  let strategy = 0;
  let opportunities = 0;
  let actionRequired = 0;

  for (const { alert, isRead } of visible) {
    if (!isRead) unread++;
    switch (alert.category) {
      case "retirement":
        retirement++;
        break;
      case "price-movement":
        priceMovement++;
        break;
      case "price-target":
        priceTarget++;
        break;
      case "strategy":
        strategy++;
        break;
      case "opportunities":
        opportunities++;
        break;
      case "action-required":
        actionRequired++;
        break;
    }
  }

  return {
    unread,
    retirement,
    priceMovement,
    priceTarget,
    strategy,
    opportunities,
    actionRequired,
  };
}

export function filterAlertsByCategory(
  items: { alert: Alert; isRead: boolean }[],
  filter: AlertFilterKey,
): { alert: Alert; isRead: boolean }[] {
  if (filter === "all") return items;
  return items.filter(({ alert }) => alert.category === filter);
}
