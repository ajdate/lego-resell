export type FreshnessTier = "fresh" | "recent" | "aging" | "outdated";

export const DEFAULT_LAST_UPDATED = "2026-05-01";
export const DEFAULT_DATA_SOURCE =
  "Manual — BrickLink & eBay sold listings";

export function getDaysSinceUpdate(lastUpdated: string): number {
  const updated = new Date(lastUpdated);
  const now = new Date();
  updated.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = now.getTime() - updated.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

export function getFreshnessTier(days: number): FreshnessTier {
  if (days <= 7) return "fresh";
  if (days <= 30) return "recent";
  if (days <= 60) return "aging";
  return "outdated";
}

export function getFreshnessLabel(days: number): string {
  switch (getFreshnessTier(days)) {
    case "fresh":
      return "Fresh";
    case "recent":
      return "Recent";
    case "aging":
      return "Aging";
    case "outdated":
      return "Outdated";
  }
}

/** Tailwind text colour class */
export function getFreshnessColor(days: number): string {
  switch (getFreshnessTier(days)) {
    case "fresh":
      return "text-emerald-400";
    case "recent":
      return "text-[#f59e0b]";
    case "aging":
      return "text-orange-400";
    case "outdated":
      return "text-red-400";
  }
}

export function getFreshnessBadgeBg(days: number): string {
  switch (getFreshnessTier(days)) {
    case "fresh":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-800/50";
    case "recent":
      return "bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40";
    case "aging":
      return "bg-orange-500/20 text-orange-400 border-orange-800/50";
    case "outdated":
      return "bg-red-500/20 text-red-400 border-red-900/50";
  }
}

export function getFreshnessIcon(days: number): string {
  switch (getFreshnessTier(days)) {
    case "fresh":
      return "✦";
    case "recent":
      return "◆";
    case "aging":
      return "⚠";
    case "outdated":
      return "✕";
  }
}

export function formatLastUpdatedDisplay(lastUpdated: string): string {
  return new Date(lastUpdated).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isStaleData(days: number): boolean {
  return days > 30;
}

export function brickLinkCatalogUrl(setNumber: string): string {
  return `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${encodeURIComponent(setNumber)}-1`;
}

export function getSetFreshness(
  lastUpdated: string = DEFAULT_LAST_UPDATED,
): {
  days: number;
  label: string;
  colorClass: string;
  badgeClass: string;
  icon: string;
  tier: FreshnessTier;
  stale: boolean;
} {
  const days = getDaysSinceUpdate(lastUpdated);
  return {
    days,
    label: getFreshnessLabel(days),
    colorClass: getFreshnessColor(days),
    badgeClass: getFreshnessBadgeBg(days),
    icon: getFreshnessIcon(days),
    tier: getFreshnessTier(days),
    stale: isStaleData(days),
  };
}
