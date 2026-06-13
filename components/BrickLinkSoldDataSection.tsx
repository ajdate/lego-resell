"use client";

import { useEffect, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import {
  fetchBrickLinkPrices,
  hasBrickLinkSalesData,
  type BrickLinkPricesResponse,
} from "@/lib/bricklink-prices-client";
import { useCurrency } from "@/src/lib/currencyContext";

function formatBandLine(
  label: string,
  band: BrickLinkPricesResponse["sealed"],
  formatPrice: (amount: number) => string,
): string {
  const parts: string[] = [label];

  if (band.avgPrice != null) {
    parts.push(`Avg ${formatPrice(band.avgPrice)}`);
  }

  if (band.minPrice != null && band.maxPrice != null) {
    parts.push(`Range ${formatPrice(band.minPrice)}–${formatPrice(band.maxPrice)}`);
  } else if (band.minPrice != null) {
    parts.push(`Min ${formatPrice(band.minPrice)}`);
  } else if (band.maxPrice != null) {
    parts.push(`Max ${formatPrice(band.maxPrice)}`);
  }

  if (band.qtySold != null && band.qtySold > 0) {
    parts.push(`${band.qtySold} sold`);
  }

  return parts.join(" · ");
}

export function BrickLinkSoldDataSection({
  analysis,
  data: externalData,
  loading: externalLoading,
}: {
  analysis: Analysis;
  data?: BrickLinkPricesResponse | null;
  loading?: boolean;
}) {
  const { formatPrice } = useCurrency();
  const [internalData, setInternalData] = useState<BrickLinkPricesResponse | null>(
    null,
  );
  const [internalLoading, setInternalLoading] = useState(externalData === undefined);

  const data = externalData !== undefined ? externalData : internalData;
  const loading = externalLoading ?? internalLoading;

  useEffect(() => {
    if (externalData !== undefined) return;

    let cancelled = false;
    setInternalLoading(true);

    void fetchBrickLinkPrices(analysis.set.number).then((result) => {
      if (!cancelled) {
        setInternalData(result);
        setInternalLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [analysis.set.number, externalData]);

  return (
    <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">
          BrickLink Sold Data (Last 6 months)
        </h2>
        <p className="text-xs text-zinc-500">BrickLink · Actual sold prices</p>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-zinc-500">Loading BrickLink sold data…</p>
      ) : !hasBrickLinkSalesData(data) ? (
        <p className="mt-4 text-sm text-zinc-400">
          No recent BrickLink sales data for this set
        </p>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-zinc-300">
          <p>{formatBandLine("Sealed:", data!.sealed, formatPrice)}</p>
          <p>{formatBandLine("Used:", data!.used, formatPrice)}</p>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        Based on completed sales — more reliable than active listings
      </p>
    </section>
  );
}
