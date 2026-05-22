import type { Recommendation } from "@/lib/analyze";
import type { WatchlistItem } from "@/lib/watchlist";

export interface WatchlistExportRow {
  item: WatchlistItem;
  currentRecommendation: Recommendation;
  estimatedValueUsd: number;
  retired: boolean;
  retiringSoon: boolean;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWatchlistExport(
  rows: WatchlistExportRow[],
  title = "LEGO Watch List",
): string {
  const date = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines = rows.map((row, index) => {
    const flags = [
      row.retiringSoon ? "Retiring Soon" : null,
      row.retired ? "Retired" : null,
    ]
      .filter(Boolean)
      .join(", ");
    const suffix = flags ? ` — ${flags}` : "";
    return `${index + 1}. ${row.item.setNumber} ${row.item.name} (${row.item.theme}) — ${row.currentRecommendation} — Est. ${formatUsd(row.estimatedValueUsd)}${suffix}`;
  });
  return [`${title} — ${date}`, ...lines].join("\n");
}
