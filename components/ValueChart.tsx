"use client";

import { useMemo } from "react";
import { formatAud } from "@/lib/portfolio";
import {
  filterSnapshotsByRange,
  type GrowthDateRange,
  type GrowthSnapshot,
} from "@/lib/growthTracking";

function formatChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function pickAxisIndices(length: number, count: number): number[] {
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(Math.round((i / (count - 1)) * (length - 1)));
  }
  return [...new Set(indices)];
}

function formatMonthKey(key: string): string {
  const [y, m] = key.split("-");
  if (!y || !m) return key;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function ValueChart({
  snapshots,
  dateRange,
  showProfitLoss = false,
  loading = false,
}: {
  snapshots: GrowthSnapshot[];
  dateRange: GrowthDateRange;
  showProfitLoss?: boolean;
  loading?: boolean;
}) {
  const filtered = useMemo(
    () => filterSnapshotsByRange(snapshots, dateRange),
    [snapshots, dateRange],
  );

  const points = useMemo(() => {
    return filtered.map((s) => ({
      date: s.date,
      value: showProfitLoss ? s.totalProfitLoss : s.totalEstimatedValue,
    }));
  }, [filtered, showProfitLoss]);

  const layout = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map((p) => p.value);
    const max = Math.max(...values, 1);
    const min = showProfitLoss ? Math.min(...values, 0) : 0;
    const span = max - min || 1;

    const yLabels: number[] = [];
    for (let i = 0; i < 5; i++) {
      yLabels.push(Math.round(min + (span * i) / 4));
    }

    const bars = points.map((p, index) => {
      const isNegative = showProfitLoss && p.value < 0;
      const heightPct =
        (Math.abs(p.value - (isNegative ? 0 : min)) / span) * 100;
      return {
        ...p,
        index,
        isNegative,
        heightPct: Math.max(4, heightPct),
        isLatest: index === points.length - 1,
      };
    });

    return {
      yLabels,
      bars,
      xIndices: pickAxisIndices(points.length, 7),
      min,
      span,
    };
  }, [points, showProfitLoss]);

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02]">
        <p className="text-sm text-zinc-500">Calculating chart…</p>
      </div>
    );
  }

  if (points.length <= 2) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-zinc-500">
          Keep using the app — your growth chart will appear here after a few
          days
        </p>
      </div>
    );
  }

  if (!layout) return null;

  const { yLabels, bars, xIndices, min, span } = layout;
  const zeroFromBottom = min < 0 ? ((0 - min) / span) * 100 : 0;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-opacity duration-300">
      <div className="flex h-[200px] gap-3">
        <div className="flex w-16 shrink-0 flex-col justify-between py-1 text-right">
          {[...yLabels].reverse().map((label, i) => (
            <span key={i} className="text-[10px] leading-none text-zinc-500">
              {formatAud(label)}
            </span>
          ))}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative flex flex-1 items-stretch gap-1">
            {showProfitLoss && min < 0 && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-0 border-t border-dashed border-white/30"
                style={{ bottom: `${zeroFromBottom}%` }}
              />
            )}

            {bars.map((bar) => (
              <div
                key={bar.date}
                className="group relative flex flex-1 flex-col"
              >
                {bar.isNegative ? (
                  <div
                    className="flex flex-1 flex-col justify-end"
                    style={{ paddingBottom: `${zeroFromBottom}%` }}
                  >
                    <div
                      className="w-full rounded-b-sm bg-red-500/70 transition-colors duration-300 group-hover:bg-red-400"
                      style={{
                        height: `${bar.heightPct}%`,
                        minHeight: 4,
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="flex flex-1 flex-col justify-end"
                    style={
                      showProfitLoss && min < 0
                        ? { paddingBottom: `${zeroFromBottom}%` }
                        : undefined
                    }
                  >
                    <div
                      className={`w-full rounded-t-sm transition-colors duration-300 ${
                        showProfitLoss
                          ? "bg-emerald-500/70 group-hover:bg-emerald-400"
                          : bar.isLatest
                            ? "bg-white group-hover:bg-zinc-200"
                            : "bg-[#f59e0b] group-hover:bg-[#fbbf24]"
                      }`}
                      style={{
                        height: `${bar.heightPct}%`,
                        minHeight: 4,
                      }}
                    />
                  </div>
                )}

                <div className="pointer-events-none absolute -top-9 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                  {formatChartDate(bar.date)}
                  <br />
                  {formatAud(bar.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-between">
            {xIndices.map((idx) => (
              <span
                key={points[idx].date}
                className="flex-1 truncate text-center text-[10px] text-zinc-500"
              >
                {formatChartDate(points[idx].date)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
