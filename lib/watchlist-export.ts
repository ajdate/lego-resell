import type { Recommendation } from "@/lib/analyze";
import { formatAUD } from "@/src/lib/currency";
import type { WatchlistItem } from "@/lib/watchlist";

export interface WatchlistExportRow {
  item: WatchlistItem;
  currentRecommendation: Recommendation;
  /** Estimated value in AUD (catalogue base currency) */
  estimatedValueAud: number;
  retired: boolean;
  retiringSoon: boolean;
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
    return `${index + 1}. ${row.item.setNumber} ${row.item.name} (${row.item.theme}) — ${row.currentRecommendation} — Est. ${formatAUD(row.estimatedValueAud)}${suffix}`;
  });
  return [`${title} — ${date}`, ...lines].join("\n");
}
