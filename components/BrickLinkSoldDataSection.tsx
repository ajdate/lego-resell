"use client";

import type { BrickLinkPricesResponse } from "@/lib/bricklink-prices-client";
import { hasBrickLinkSalesData } from "@/lib/bricklink-prices-client";

function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSealedRow(band: BrickLinkPricesResponse["sealed"]): string | null {
  const parts: string[] = ["Sealed:"];

  if (band.avgPrice != null) {
    parts.push(`Avg ${formatAud(Number(band.avgPrice))} AUD`);
  }

  if (band.minPrice != null && band.maxPrice != null) {
    parts.push(
      `Range ${formatAud(Number(band.minPrice))}–${formatAud(Number(band.maxPrice))}`,
    );
  }

  if (band.qtySold != null && Number(band.qtySold) > 0) {
    parts.push(`${band.qtySold} sold in last 6 months`);
  }

  return parts.length > 1 ? parts.join(" · ") : null;
}

function formatUsedRow(band: BrickLinkPricesResponse["used"]): string | null {
  const parts: string[] = ["Used:"];

  if (band.avgPrice != null) {
    parts.push(`Avg ${formatAud(Number(band.avgPrice))} AUD`);
  }

  if (band.minPrice != null && band.maxPrice != null) {
    parts.push(
      `Range ${formatAud(Number(band.minPrice))}–${formatAud(Number(band.maxPrice))}`,
    );
  }

  if (band.qtySold != null && Number(band.qtySold) > 0) {
    parts.push(`${band.qtySold} sold`);
  }

  return parts.length > 1 ? parts.join(" · ") : null;
}

export function BrickLinkSoldDataSection({
  bricklinkData,
}: {
  bricklinkData: BrickLinkPricesResponse | null;
}) {
  if (!bricklinkData) {
    return (
      <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <p className="text-xs text-zinc-500">Loading BrickLink sold data…</p>
      </section>
    );
  }

  const sealedLine = formatSealedRow(bricklinkData.sealed);
  const usedLine = formatUsedRow(bricklinkData.used);
  const hasData = hasBrickLinkSalesData(bricklinkData);

  return (
    <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">
          BrickLink Sold Prices{" "}
          <span className="text-sm font-bold text-[#f59e0b]">BrickLink</span>
        </h2>
        <p className="text-xs text-zinc-500">
          Based on completed sales — more accurate than active listings
        </p>
      </div>

      {!hasData ? (
        <p className="mt-4 text-sm text-zinc-400">
          No recent BrickLink sales data available
        </p>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-zinc-300">
          {sealedLine && <p>{sealedLine}</p>}
          {usedLine && <p>{usedLine}</p>}
          {!sealedLine && !usedLine && (
            <p className="text-zinc-400">
              No recent BrickLink sales data available
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        Source: BrickLink marketplace · AUD
      </p>
    </section>
  );
}
