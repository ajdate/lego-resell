"use client";

import { useMemo, useState } from "react";
import {
  BENCHMARK_CAGR,
  gradeBadgeClass,
  type BattleComparison,
  type SimulationResult,
} from "@/lib/investmentSimulator";

function formatAud(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function GradeBadge({ grade }: { grade: SimulationResult["grade"] }) {
  return (
    <span
      className={`inline-flex rounded-lg border px-2.5 py-1 text-sm font-black ${gradeBadgeClass(grade)}`}
    >
      {grade}
    </span>
  );
}

function SummaryCard({
  result,
  side,
  highlight,
}: {
  result: SimulationResult;
  side: "a" | "b";
  highlight: boolean;
}) {
  const accent =
    side === "a"
      ? "border-amber-500/40 ring-amber-500/20"
      : "border-blue-500/40 ring-blue-500/20";
  const textAccent = side === "a" ? "text-amber-400" : "text-blue-400";

  return (
    <div
      className={`rounded-2xl border bg-white/[0.02] p-5 ${
        highlight ? `ring-1 ${accent}` : "border-white/8"
      }`}
    >
      <p className="text-xs font-medium text-zinc-500">Set {side === "a" ? "A" : "B"}</p>
      <h3 className="mt-1 font-bold text-white">{result.setName}</h3>
      <p className="mt-3 text-sm text-zinc-400">
        Initial:{" "}
        <span className="text-white">{formatAud(result.initialInvestment)}</span>
      </p>
      <p className="mt-1 text-lg font-bold text-white">
        Current: {formatAud(result.estimatedCurrentValue)}
      </p>
      <p className={`mt-1 text-sm font-semibold ${textAccent}`}>
        +{formatAud(result.totalReturn)} (+{result.totalReturnPercent}%)
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs text-zinc-500">CAGR</p>
          <p className={`text-xl font-black ${textAccent}`}>{result.cagr}%</p>
        </div>
        <GradeBadge grade={result.grade} />
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Holding: {result.holdingYears} years · Peak {formatAud(result.peakValue)}{" "}
        ({result.peakYear})
      </p>
    </div>
  );
}

function ValueGrowthChart({
  resultA,
  resultB,
}: {
  resultA: SimulationResult;
  resultB: SimulationResult;
}) {
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const r of resultA.annualReturns) set.add(r.year);
    for (const r of resultB.annualReturns) set.add(r.year);
    return [...set].sort((a, b) => a - b);
  }, [resultA, resultB]);

  const maxValue = useMemo(() => {
    let m = 0;
    for (const y of years) {
      const va =
        resultA.annualReturns.find((r) => r.year === y)?.value ?? 0;
      const vb =
        resultB.annualReturns.find((r) => r.year === y)?.value ?? 0;
      m = Math.max(m, va, vb);
    }
    return m * 1.1 || 1;
  }, [years, resultA, resultB]);

  const mapA = new Map(resultA.annualReturns.map((r) => [r.year, r]));
  const mapB = new Map(resultB.annualReturns.map((r) => [r.year, r]));

  return (
    <div className="mt-6">
      <div className="relative border-b border-white/10 pb-2">
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <div
            key={pct}
            className="pointer-events-none absolute left-0 right-0 border-t border-white/10"
            style={{ bottom: `${pct * 100}%` }}
          />
        ))}
        <div className="flex items-end justify-between gap-1 overflow-x-auto px-1 pt-8">
          {years.map((year) => {
            const rowA = mapA.get(year);
            const rowB = mapB.get(year);
            const hA = ((rowA?.value ?? 0) / maxValue) * 100;
            const hB = ((rowB?.value ?? 0) / maxValue) * 100;
            const retiredA = year === resultA.estimatedRetirementYear;
            const retiredB = year === resultB.estimatedRetirementYear;
            const eventA = rowA?.event;
            const eventB = rowB?.event;

            return (
              <div
                key={year}
                className="relative flex min-w-[2.5rem] flex-1 flex-col items-center"
              >
                {(eventA || eventB) && (
                  <span
                    className="mb-1 max-w-[4rem] truncate text-center text-[9px] leading-tight text-zinc-500"
                    title={[eventA, eventB].filter(Boolean).join(" · ")}
                  >
                    {(eventA ?? eventB)?.split(" · ")[0]}
                  </span>
                )}
                <div className="flex h-40 w-full items-end justify-center gap-0.5">
                  <div
                    className="w-[42%] max-w-5 rounded-t bg-amber-500/80 transition-all"
                    style={{ height: `${Math.max(hA, 2)}%` }}
                    title={`${resultA.setName} ${year}: ${formatAud(rowA?.value ?? 0)}`}
                  />
                  <div
                    className="w-[42%] max-w-5 rounded-t bg-blue-500/80 transition-all"
                    style={{ height: `${Math.max(hB, 2)}%` }}
                    title={`${resultB.setName} ${year}: ${formatAud(rowB?.value ?? 0)}`}
                  />
                </div>
                {(retiredA || retiredB) && (
                  <div
                    className="absolute bottom-0 left-1/2 h-full w-px -translate-x-1/2 border-l border-dashed border-red-400/60"
                    aria-hidden
                  />
                )}
                <span className="mt-2 text-[10px] tabular-nums text-zinc-500">
                  {year}
                </span>
                {(retiredA || retiredB) && (
                  <span className="text-[8px] font-semibold text-red-400">
                    Retired
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-500" />
          {resultA.setName}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-blue-500" />
          {resultB.setName}
        </span>
      </div>
    </div>
  );
}

function RiskRewardQuadrant({
  resultA,
  resultB,
}: {
  resultA: SimulationResult;
  resultB: SimulationResult;
}) {
  const maxVol = Math.max(resultA.volatilityScore, resultB.volatilityScore, 25);
  const maxCagr = Math.max(resultA.cagr, resultB.cagr, 25);

  function pos(r: SimulationResult) {
    const x = Math.min(92, Math.max(8, (r.volatilityScore / maxVol) * 85 + 8));
    const y = Math.min(92, Math.max(8, 92 - (r.cagr / maxCagr) * 85));
    return { left: `${x}%`, top: `${y}%` };
  }

  return (
    <div className="relative aspect-square w-full max-w-md">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-xl border border-white/10">
        <div className="border-b border-r border-white/5 bg-emerald-950/20 p-2 text-[10px] text-zinc-500">
          Star Investment
        </div>
        <div className="border-b border-white/5 bg-amber-950/15 p-2 text-right text-[10px] text-zinc-500">
          Speculative
        </div>
        <div className="border-r border-white/5 bg-zinc-900/40 p-2 text-[10px] text-zinc-500">
          Safe Hold
        </div>
        <div className="bg-red-950/15 p-2 text-right text-[10px] text-zinc-500">
          Avoid
        </div>
      </div>
      <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-zinc-500">
        Risk (volatility) →
      </p>
      <p className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-zinc-500">
        Return (CAGR) →
      </p>
      <div
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 ring-2 ring-amber-300/50"
        style={pos(resultA)}
        title={`${resultA.setName}: ${resultA.cagr}% CAGR, ${resultA.volatilityScore}% vol`}
      />
      <div
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 ring-2 ring-blue-300/50"
        style={pos(resultB)}
        title={`${resultB.setName}: ${resultB.cagr}% CAGR, ${resultB.volatilityScore}% vol`}
      />
    </div>
  );
}

function BenchmarkBars({
  resultA,
  resultB,
}: {
  resultA: SimulationResult;
  resultB: SimulationResult;
}) {
  const rows = [
    { label: resultA.setName, value: resultA.cagr, color: "bg-amber-500" },
    { label: resultB.setName, value: resultB.cagr, color: "bg-blue-500" },
    {
      label: "Avg LEGO set",
      value: BENCHMARK_CAGR.averageLego,
      color: "bg-zinc-500",
    },
    {
      label: "Premium LEGO (UCS/Modular)",
      value: BENCHMARK_CAGR.premiumLego,
      color: "bg-zinc-400",
    },
    {
      label: "S&P 500 (reference)",
      value: BENCHMARK_CAGR.sp500,
      color: "bg-zinc-600",
    },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-zinc-400">{row.label}</span>
            <span className="font-medium tabular-nums text-white">
              {row.value}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${row.color}`}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-zinc-600">
        S&P 500 shown for reference only — not a direct comparison asset class.
      </p>
    </div>
  );
}

export function InvestmentBattleResults({
  battle,
  onShare,
  onCopySummary,
  linkCopied,
  summaryCopied,
}: {
  battle: BattleComparison;
  onShare: () => void;
  onCopySummary: () => void;
  linkCopied: boolean;
  summaryCopied: boolean;
}) {
  const [tableOpen, setTableOpen] = useState(false);
  const { resultA, resultB, winner } = battle;

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const r of resultA.annualReturns) set.add(r.year);
    for (const r of resultB.annualReturns) set.add(r.year);
    return [...set].sort((a, b) => a - b);
  }, [resultA, resultB]);

  const mapA = new Map(resultA.annualReturns.map((r) => [r.year, r]));
  const mapB = new Map(resultB.annualReturns.map((r) => [r.year, r]));

  const winnerName =
    winner === "a"
      ? resultA.setName
      : winner === "b"
        ? resultB.setName
        : null;
  const winnerResult = winner === "a" ? resultA : winner === "b" ? resultB : null;

  return (
    <div className="mt-10 space-y-8">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-amber-950/30 to-transparent p-6 text-center sm:p-8">
        {winner && winnerResult && winnerName ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">
              Winner
            </p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Set {winner === "a" ? "A" : "B"} wins — {winnerName}
            </h2>
            <p className="mt-3 text-lg text-amber-100">
              {formatAud(winnerResult.estimatedCurrentValue)} · +
              {winnerResult.totalReturnPercent}% total return
            </p>
            <div className="mt-3 flex justify-center">
              <GradeBadge grade={winnerResult.grade} />
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-white">Too close to call</h2>
            <p className="mt-2 text-zinc-300">
              Returns within 10% — both sets performed similarly in this model.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onShare}
          className="touch-target rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-[#f59e0b]/40"
        >
          {linkCopied ? "Link copied!" : "Share Results"}
        </button>
        <button
          type="button"
          onClick={onCopySummary}
          className="touch-target rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-[#f59e0b]/40"
        >
          {summaryCopied ? "Summary copied!" : "Copy Summary"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          result={resultA}
          side="a"
          highlight={winner === "a"}
        />
        <SummaryCard
          result={resultB}
          side="b"
          highlight={winner === "b"}
        />
      </div>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <h3 className="text-lg font-bold text-white">Value growth</h3>
        <ValueGrowthChart resultA={resultA} resultB={resultB} />
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <button
          type="button"
          onClick={() => setTableOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="text-lg font-bold text-white">Year by year</h3>
          <span className="text-[#f59e0b]">{tableOpen ? "↑" : "↓"}</span>
        </button>
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: tableOpen ? "1200px" : "0" }}
        >
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-2">Year</th>
                  <th className="py-2 px-2 text-amber-400">Set A</th>
                  <th className="py-2 px-2 text-amber-400/70">YoY%</th>
                  <th className="py-2 px-2 text-blue-400">Set B</th>
                  <th className="py-2 px-2 text-blue-400/70">YoY%</th>
                  <th className="py-2 pl-2">Events</th>
                </tr>
              </thead>
              <tbody>
                {years.map((year, i) => {
                  const rowA = mapA.get(year);
                  const rowB = mapB.get(year);
                  const events = [rowA?.event, rowB?.event]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <tr
                      key={year}
                      className={
                        i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                      }
                    >
                      <td className="py-2 pr-2 font-medium text-white">
                        {year}
                      </td>
                      <td className="py-2 px-2 tabular-nums text-zinc-200">
                        {formatAud(rowA?.value ?? 0)}
                      </td>
                      <td
                        className={`py-2 px-2 tabular-nums ${
                          (rowA?.yoyPercent ?? 0) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {rowA?.yoyPercent != null
                          ? `${rowA.yoyPercent > 0 ? "+" : ""}${rowA.yoyPercent}%`
                          : "—"}
                      </td>
                      <td className="py-2 px-2 tabular-nums text-zinc-200">
                        {formatAud(rowB?.value ?? 0)}
                      </td>
                      <td
                        className={`py-2 px-2 tabular-nums ${
                          (rowB?.yoyPercent ?? 0) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {rowB?.yoyPercent != null
                          ? `${rowB.yoyPercent > 0 ? "+" : ""}${rowB.yoyPercent}%`
                          : "—"}
                      </td>
                      <td className="py-2 pl-2 text-xs text-zinc-500">
                        {events || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <h3 className="text-lg font-bold text-white">What this means</h3>
          <ul className="mt-4 space-y-3">
            {battle.whatThisMeans.map((line) => (
              <li
                key={line}
                className="flex gap-2 text-sm leading-relaxed text-zinc-300"
              >
                <span className="text-[#f59e0b]">•</span>
                {line}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <h3 className="text-lg font-bold text-white">Strategy insights</h3>
          <ul className="mt-4 space-y-3">
            {battle.strategyInsights.map((line) => (
              <li
                key={line}
                className="flex gap-2 text-sm leading-relaxed text-zinc-300"
              >
                <span className="text-[#f59e0b]">•</span>
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <h3 className="text-lg font-bold text-white">Risk / reward</h3>
          <div className="mt-6 flex justify-center pb-8">
            <RiskRewardQuadrant resultA={resultA} resultB={resultB} />
          </div>
          <div className="flex justify-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {resultA.setName}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {resultB.setName}
            </span>
          </div>
        </section>
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <h3 className="text-lg font-bold text-white">Benchmark comparison</h3>
          <div className="mt-4">
            <BenchmarkBars resultA={resultA} resultB={resultB} />
          </div>
        </section>
      </div>
    </div>
  );
}
