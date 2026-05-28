"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SimulatorSetPicker } from "@/components/SimulatorSetPicker";
import { findSet } from "@/lib/analyze";
import { buildBenchmarkHref, parseBenchmarkSearchParams } from "@/lib/benchmark-url";
import {
  BENCHMARKS,
  calculateBenchmarkValue,
  getBenchmarkComparison,
  getPerformanceLabel,
  performanceToneClass,
} from "@/lib/benchmarks";
import { simulateInvestment, type SimulationCondition } from "@/lib/investmentSimulator";

const START_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022] as const;

const QUICK_COMPARISONS = [
  {
    title: "How did the Millennium Falcon do vs S&P 500?",
    set: "75192",
    condition: "sealed" as SimulationCondition,
    from: 2018,
  },
  {
    title: "Did Modular buildings beat property?",
    set: "10297",
    condition: "sealed" as SimulationCondition,
    from: 2020,
  },
  {
    title: "Was Ghostbusters Ecto-1 better than gold?",
    set: "10274",
    condition: "sealed" as SimulationCondition,
    from: 2020,
  },
];

function formatAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function gradeFromCagr(cagr: number): "S" | "A" | "B" | "C" | "D" {
  if (cagr > 20) return "S";
  if (cagr >= 15) return "A";
  if (cagr >= 10) return "B";
  if (cagr >= 5) return "C";
  return "D";
}

function BenchmarkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [setNumber, setSetNumber] = useState("");
  const [setName, setSetName] = useState<string | null>(null);
  const [condition, setCondition] = useState<SimulationCondition>("sealed");
  const [invested, setInvested] = useState("1000");
  const [fromYear, setFromYear] = useState<number>(2020);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [run, setRun] = useState(false);

  const syncUrl = useCallback(
    (s: string, c: SimulationCondition, i: number, f: number) => {
      router.replace(
        buildBenchmarkHref({
          set: s,
          condition: c,
          invested: i,
          from: f,
        }),
        { scroll: false },
      );
    },
    [router],
  );

  useEffect(() => {
    if (loaded) return;
    const parsed = parseBenchmarkSearchParams(new URLSearchParams(searchParams.toString()));
    if (parsed.set) {
      setSetNumber(parsed.set);
      const s = findSet(parsed.set);
      if (s) setSetName(s.name);
    }
    setCondition(parsed.condition);
    setInvested(String(parsed.invested));
    setFromYear(parsed.from);
    if (parsed.set) setRun(true);
    setLoaded(true);
  }, [loaded, searchParams]);

  const investedNum = useMemo(() => parseFloat(invested) || 1000, [invested]);
  const simulation = useMemo(() => {
    if (!run || !setNumber.trim()) return null;
    return simulateInvestment(setNumber.trim(), {
      initialInvestment: investedNum,
      startYear: fromYear,
      condition,
    });
  }, [run, setNumber, investedNum, fromYear, condition]);

  const years = simulation?.holdingYears ?? 0;
  const setCagr = simulation?.cagr ?? 0;
  const setFinalValue = simulation?.estimatedCurrentValue ?? 0;
  const perfLabel = getPerformanceLabel(setCagr);
  const perfTone = performanceToneClass(setCagr);
  const grade = gradeFromCagr(setCagr);

  const benchmarkRows = useMemo(() => {
    if (!simulation) return [];
    const rows = BENCHMARKS.map((b) => ({
      ...b,
      value: calculateBenchmarkValue(investedNum, b.cagr, years),
    }));
    rows.push({
      id: "set",
      label: `${simulation.setName} (Your Set)`,
      cagr: simulation.cagr,
      color: "#f59e0b",
      description: "Selected LEGO set",
      risk: "Medium",
      value: simulation.estimatedCurrentValue,
    });
    return rows.sort((a, b) => b.cagr - a.cagr);
  }, [simulation, investedNum, years]);

  const maxCagr = Math.max(...benchmarkRows.map((b) => b.cagr), 1);
  const maxValue = Math.max(...benchmarkRows.map((b) => b.value), 1);

  const comparison = useMemo(() => getBenchmarkComparison(setCagr), [setCagr]);

  const insights = useMemo(() => {
    if (!simulation) return [];
    const sp = BENCHMARKS.find((b) => b.id === "sp500");
    const cash = BENCHMARKS.find((b) => b.id === "cash");
    const premium = BENCHMARKS.find((b) => b.id === "premium-lego");
    const beatSp = sp ? simulation.cagr - sp.cagr : 0;
    const spValue = sp ? calculateBenchmarkValue(investedNum, sp.cagr, years) : 0;
    const cashValue = cash ? calculateBenchmarkValue(investedNum, cash.cagr, years) : 0;
    return [
      `A ${formatAud(investedNum)} investment in ${simulation.setName} in ${fromYear} would be worth ${formatAud(simulation.estimatedCurrentValue)} today — ${formatAud(Math.max(0, simulation.estimatedCurrentValue - spValue))} more than the same investment in the S&P 500.`,
      `${simulation.setName} outperformed ${comparison.outperformed.length} of ${BENCHMARKS.length} benchmarks over this period.`,
      `Only ${comparison.underperformed.slice(0, 2).map((b) => b.label).join(" and ")} outperformed this set.`,
      `Compared to cash savings, ${simulation.setName} delivered ${cashValue > 0 ? (simulation.estimatedCurrentValue / cashValue).toFixed(1) : "0"}x more ending value over the same period.`,
      premium ? `Premium LEGO category CAGR (${premium.cagr}%) vs this set (${simulation.cagr}%).` : "",
    ].filter(Boolean);
  }, [simulation, investedNum, years, fromYear, comparison]);

  function handleCompare() {
    if (!setNumber.trim()) {
      setError("Select a set first.");
      return;
    }
    const s = findSet(setNumber.trim());
    if (!s) {
      setError("Set not found.");
      return;
    }
    setSetName(s.name);
    setError("");
    setRun(true);
    syncUrl(setNumber.trim(), condition, investedNum, fromYear);
  }

  async function handleCopy() {
    if (!simulation) return;
    const out = comparison.outperformed.map((b) => b.label).join(", ") || "None";
    const text = `📊 LEGO Investment Benchmark — BrickValue

Set: ${simulation.setName} (#${simulation.setNumber}) · ${condition === "sealed" ? "Sealed" : "Complete"}
${formatAud(investedNum)} invested in ${fromYear} → ${formatAud(simulation.estimatedCurrentValue)} today
CAGR: ${simulation.cagr}% · Grade: ${grade}

Outperformed: ${out}

via BrickValue · lego-resell-ten.vercel.app/benchmark`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader title="Benchmark Comparison" subtitle="BrickValue tools" />
      <main className="page-main mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Benchmark Comparison</h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            How do LEGO sets compare to traditional investments?
          </p>
          <p className="mt-3 text-xs italic text-zinc-500">
            Educational comparison only. Past performance does not guarantee future returns.
          </p>
        </div>

        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SimulatorSetPicker
              label="Set"
              inputId="benchmark-set"
              setNumber={setNumber}
              setName={setName}
              condition={condition}
              onSetNumberChange={setSetNumber}
              onSetResolved={(num, name) => {
                setSetNumber(num);
                setSetName(name);
              }}
              onConditionChange={setCondition}
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Investment amount (AUD)
              </label>
              <input
                type="number"
                min={1}
                value={invested}
                onChange={(e) => setInvested(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Start year
              </label>
              <select
                value={fromYear}
                onChange={(e) => setFromYear(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
              >
                {START_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCompare}
                className="w-full rounded-xl bg-[#f59e0b] py-3.5 text-sm font-bold text-zinc-900 hover:bg-[#fbbf24]"
              >
                Compare →
              </button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        {simulation && (
          <>
            <section className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                LEGO {simulation.setName} vs The Market
              </p>
              <p className={`mt-2 text-4xl font-black ${perfTone}`}>{simulation.cagr}% CAGR</p>
              <p className={`mt-1 text-sm ${perfTone}`}>{perfLabel}</p>
              <p className="mt-2 text-sm text-zinc-400">
                {formatAud(investedNum)} in {fromYear} → {formatAud(setFinalValue)} today
              </p>
            </section>

            <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h2 className="text-lg font-bold text-white">Benchmark bar comparison</h2>
              <div className="mt-4 space-y-2">
                {benchmarkRows.map((b) => {
                  const isSet = b.id === "set";
                  const width = `${(b.cagr / maxCagr) * 100}%`;
                  return (
                    <div key={b.id} className="grid grid-cols-[220px_1fr_80px_110px] items-center gap-3 text-sm">
                      <span className={`truncate ${isSet ? "font-semibold text-amber-300" : "text-zinc-300"}`}>
                        {isSet ? "★ " : ""}
                        {b.label}
                      </span>
                      <div className="relative h-8 rounded-r-full bg-zinc-900">
                        <div
                          className="h-full rounded-r-full opacity-80"
                          style={{
                            width,
                            backgroundColor: isSet ? "#f59e0b" : b.color,
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-right text-white">{b.cagr.toFixed(1)}%</span>
                      <span className="tabular-nums text-right text-zinc-200">{formatAud(b.value)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <p className="font-semibold text-emerald-300">
                  ✦ This set outperformed {comparison.outperformed.length} of {BENCHMARKS.length} benchmarks
                </p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {comparison.outperformed.map((b) => {
                    const bValue = calculateBenchmarkValue(investedNum, b.cagr, years);
                    const margin = simulation.cagr - b.cagr;
                    return (
                      <li key={b.id}>
                        Beat {b.label} by +{margin.toFixed(1)}% CAGR · {formatAud(Math.max(0, simulation.estimatedCurrentValue - bValue))} more per {formatAud(investedNum)} invested
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="font-semibold text-zinc-300">
                  This set underperformed {comparison.underperformed.length} benchmarks
                </p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                  {comparison.underperformed.slice(0, 4).map((b) => (
                    <li key={b.id}>
                      {b.label} beat this set by +{(b.cagr - simulation.cagr).toFixed(1)}% CAGR
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h2 className="text-lg font-bold text-white">Value growth comparison</h2>
              <div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto border-b border-white/10 pb-3">
                {benchmarkRows.map((b) => {
                  const h = `${(b.value / maxValue) * 100}%`;
                  const isSet = b.id === "set";
                  return (
                    <div key={`v-${b.id}`} className="flex min-w-[72px] flex-col items-center">
                      <span className="mb-1 text-[10px] font-semibold text-white">{formatAud(b.value)}</span>
                      <div
                        className={`w-10 rounded-t ${isSet ? "bg-amber-500" : "opacity-70"}`}
                        style={{ height: h, backgroundColor: isSet ? "#f59e0b" : b.color }}
                      />
                      <span className={`mt-1 text-center text-[10px] ${isSet ? "text-amber-300" : "text-zinc-400"}`}>
                        {b.id === "set" ? simulation.setName : b.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h2 className="text-lg font-bold text-white">Risk-adjusted comparison</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase text-zinc-500">
                      <th className="py-2 pr-2">Asset</th>
                      <th className="py-2 px-2">CAGR</th>
                      <th className="py-2 px-2">Risk</th>
                      <th className="py-2 px-2">Risk-adjusted</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-amber-500/10">
                      <td className="py-2 pr-2 text-amber-300">LEGO {simulation.setName}</td>
                      <td className="py-2 px-2 text-white">{simulation.cagr}%</td>
                      <td className="py-2 px-2 text-zinc-300">Medium</td>
                      <td className="py-2 px-2 text-zinc-300">Strong for collectibles</td>
                    </tr>
                    {BENCHMARKS.map((b) => (
                      <tr key={`risk-${b.id}`} className="border-b border-white/5">
                        <td className="py-2 pr-2 text-zinc-300">{b.label}</td>
                        <td className="py-2 px-2 text-white">{b.cagr}%</td>
                        <td className="py-2 px-2 text-zinc-400">{b.risk}</td>
                        <td className="py-2 px-2 text-zinc-500">{(b.cagr / (b.risk === "Extreme" ? 4 : b.risk === "Medium-High" ? 2.5 : b.risk === "Medium" ? 2 : 1.5)).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-zinc-400">
                Conclusion: {simulation.setName} delivered {simulation.cagr >= 10.5 ? "better" : "weaker"} risk-adjusted returns than equities for this period.
              </p>
            </section>

            <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h2 className="text-lg font-bold text-white">Key insights</h2>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {insights.slice(0, 4).map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-[#f59e0b]">•</span>
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h2 className="text-lg font-bold text-white">Disclaimer</h2>
              <ul className="mt-3 space-y-1 text-xs italic text-zinc-500">
                <li>This comparison is for educational purposes only.</li>
                <li>LEGO valuations are estimated — real returns vary based on condition, timing and market.</li>
                <li>Bitcoin included for reference only — extreme volatility makes direct comparison misleading.</li>
                <li>Past performance does not guarantee future returns.</li>
                <li>This is not financial advice.</li>
              </ul>
            </section>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-[#f59e0b]/40"
              >
                {copied ? "Summary copied!" : "Share"}
              </button>
            </div>
          </>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-bold text-white">Quick comparisons</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {QUICK_COMPARISONS.map((q) => (
              <button
                key={q.title}
                type="button"
                onClick={() => {
                  setSetNumber(q.set);
                  setCondition(q.condition);
                  setFromYear(q.from);
                  const s = findSet(q.set);
                  setSetName(s?.name ?? null);
                  setRun(true);
                  syncUrl(q.set, q.condition, investedNum, q.from);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left text-sm text-zinc-300 hover:border-[#f59e0b]/40"
              >
                {q.title}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function BenchmarkPage() {
  return (
    <Suspense
      fallback={
        <div className="page-main mx-auto max-w-5xl px-4 py-16 text-center text-zinc-500">
          Loading benchmark comparison…
        </div>
      }
    >
      <BenchmarkPageContent />
    </Suspense>
  );
}

