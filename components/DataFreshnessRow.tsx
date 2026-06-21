"use client";

import {
  brickLinkCatalogUrl,
  formatLastUpdatedDisplay,
  getSetFreshness,
} from "@/lib/freshness";
import { useIsClient } from "@/src/hooks/useIsClient";

export function FreshnessBadge({
  lastUpdated,
  compact,
}: {
  lastUpdated: string;
  compact?: boolean;
}) {
  const isClient = useIsClient();
  const f = isClient ? getSetFreshness(lastUpdated) : null;

  if (!f) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-sm font-semibold text-zinc-400 ${
          compact ? "px-2 py-0.5 text-xs" : ""
        }`}
      >
        <span aria-hidden>◆</span>
        Recent
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-semibold ${f.badgeClass} ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      <span aria-hidden>{f.icon}</span>
      {f.label}
    </span>
  );
}

export function DataFreshnessRow({
  setNumber,
  lastUpdated,
  dataSource,
}: {
  setNumber: string;
  lastUpdated: string;
  dataSource: string;
}) {
  const isClient = useIsClient();
  const f = isClient ? getSetFreshness(lastUpdated) : null;
  const dateDisplay = formatLastUpdatedDisplay(lastUpdated);

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Data last updated:{" "}
          <span className="text-zinc-400">{dateDisplay}</span>
          <span className="text-zinc-600"> · </span>
          <span className="text-zinc-400">Source: {dataSource}</span>
        </p>
        <FreshnessBadge lastUpdated={lastUpdated} compact />
      </div>

      {f?.stale && (
        <p className="mt-2 text-xs text-orange-400" role="status">
          ⚠️ This data may not reflect current market prices. Verify on BrickLink
          or eBay before listing.
        </p>
      )}

      <a
        href={brickLinkCatalogUrl(setNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-[#f59e0b] transition hover:text-[#fbbf24] hover:underline"
      >
        Check live prices on BrickLink →
      </a>
    </div>
  );
}
