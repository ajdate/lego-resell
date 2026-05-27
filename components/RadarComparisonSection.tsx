"use client";

import { RadarChart } from "@/components/RadarChart";
import {
  buildRadarChartProps,
  buildRadarInsights,
  metricWinner,
  RADAR_METRIC_DEFS,
  type RadarMetrics,
} from "@/lib/radar-metrics";
import type { ComparedSetData } from "@/lib/set-comparison";

function MetricScoreCard({
  fullName,
  scoreA,
  scoreB,
  winner,
}: {
  fullName: string;
  scoreA: number;
  scoreB: number;
  winner: "a" | "b" | "tie";
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-xs font-medium text-zinc-500">{fullName}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
        <span
          className={`rounded-md px-2 py-1 font-bold tabular-nums ${
            winner === "a"
              ? "bg-amber-500/20 text-amber-300"
              : "text-amber-400/80"
          }`}
        >
          {scoreA}
        </span>
        <span className="text-[10px] text-zinc-600">vs</span>
        <span
          className={`rounded-md px-2 py-1 font-bold tabular-nums ${
            winner === "b"
              ? "bg-blue-500/20 text-blue-300"
              : "text-blue-400/80"
          }`}
        >
          {scoreB}
        </span>
      </div>
    </div>
  );
}

export function RadarComparisonSection({
  dataA,
  dataB,
  onShare,
  linkCopied,
}: {
  dataA: ComparedSetData;
  dataB: ComparedSetData;
  onShare: () => void;
  linkCopied: boolean;
}) {
  const { setA, setB, metricsA, metricsB } = buildRadarChartProps(
    dataA,
    dataB,
  );
  const insights = buildRadarInsights(
    setA.name,
    metricsA,
    setB.name,
    metricsB,
  );

  return (
    <section className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white sm:text-xl">
            Investment Profile Comparison
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Higher coverage = stronger investment profile
          </p>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="touch-target shrink-0 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-[#f59e0b]/40 hover:text-white"
        >
          {linkCopied ? "Link copied!" : "Share Comparison"}
        </button>
      </div>

      <div className="mt-6 flex justify-center">
        <RadarChart setA={setA} setB={setB} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RADAR_METRIC_DEFS.map((def) => (
          <MetricScoreCard
            key={def.key}
            fullName={def.fullName}
            scoreA={metricsA[def.key as keyof RadarMetrics]}
            scoreB={metricsB[def.key as keyof RadarMetrics]}
            winner={metricWinner(
              metricsA[def.key as keyof RadarMetrics],
              metricsB[def.key as keyof RadarMetrics],
            )}
          />
        ))}
      </div>

      {insights.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Radar insights
          </p>
          <ul className="mt-3 space-y-2">
            {insights.map((line) => (
              <li
                key={line}
                className="flex gap-2 text-sm leading-relaxed text-zinc-300"
              >
                <span className="shrink-0 text-[#f59e0b]" aria-hidden>
                  •
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
