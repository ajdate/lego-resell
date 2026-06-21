"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { InvestmentBattleResults } from "@/components/InvestmentBattleResults";
import { SimulatorSetPicker } from "@/components/SimulatorSetPicker";
import {
  AU_CPI_AVG,
  formatSimulationSummary,
  QUICK_BATTLES,
  runBattleSimulation,
  simulateInvestment,
  SIMULATOR_START_YEARS,
  type BattleComparison,
  type SimulationResult,
  type SimulationCondition,
} from "@/lib/investmentSimulator";
import {
  buildSimulatorHref,
  parseSimulatorSearchParams,
} from "@/lib/simulator-url";
import { findSet } from "@/lib/analyze";

function SimulatorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [setANumber, setSetANumber] = useState("");
  const [setBNumber, setSetBNumber] = useState("");
  const [setAName, setSetAName] = useState<string | null>(null);
  const [setBName, setSetBName] = useState<string | null>(null);
  const [condA, setCondA] = useState<SimulationCondition>("sealed");
  const [condB, setCondB] = useState<SimulationCondition>("sealed");
  const [amount, setAmount] = useState("1000");
  const [startYear, setStartYear] = useState<number>(2018);
  const [copiesA, setCopiesA] = useState("1");
  const [copiesB, setCopiesB] = useState("1");
  const [singleMode, setSingleMode] = useState(false);
  const [inflationAdjusted, setInflationAdjusted] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [battle, setBattle] = useState<BattleComparison | null>(null);
  const [singleResult, setSingleResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [urlLoaded, setUrlLoaded] = useState(false);

  const syncUrl = useCallback(
    (
      a: string,
      b: string,
      ca: SimulationCondition,
      cb: SimulationCondition,
      inv: number,
      year: number,
      single: boolean,
      cA: number,
      cB: number,
    ) => {
      router.replace(
        buildSimulatorHref({
          setA: a,
          setB: b,
          condA: ca,
          condB: cb,
          amount: inv,
          startYear: year,
          single,
          copiesA: cA,
          copiesB: cB,
        }),
        { scroll: false },
      );
    },
    [router],
  );

  const runSimulation = useCallback(
    (
      a: string,
      b: string,
      ca: SimulationCondition,
      cb: SimulationCondition,
      inv: number,
      year: number,
      cA: number,
      cB: number,
      single: boolean,
    ) => {
      if (!findSet(a)) {
        setError("Set A was not found in the catalogue.");
        return false;
      }
      if (single) {
        const result = simulateInvestment(a, {
          initialInvestment: inv,
          startYear: year,
          condition: ca,
          copies: cA,
        });
        if (!result) {
          setError("Could not run simulation. Check set and start year.");
          setBattle(null);
          setSingleResult(null);
          setSimulated(false);
          return false;
        }
        setSingleResult(result);
        setBattle(null);
      } else {
        if (!findSet(b)) {
          setError("Set B was not found in the catalogue.");
          setBattle(null);
          setSingleResult(null);
          setSimulated(false);
          return false;
        }
        const result = runBattleSimulation({
          setA: a,
          setB: b,
          initialInvestment: inv,
          startYear: year,
          conditionA: ca,
          conditionB: cb,
          copiesA: cA,
          copiesB: cB,
        });
        if (!result) {
          setError("Could not run simulation. Check set numbers and start year.");
          setBattle(null);
          setSingleResult(null);
          setSimulated(false);
          return false;
        }
        setBattle(result);
        setSingleResult(null);
      }
      setError("");
      setSimulated(true);
      syncUrl(a, b, ca, cb, inv, year, single, cA, cB);
      return true;
    },
    [syncUrl],
  );

  useEffect(() => {
    if (urlLoaded) return;
    const parsed = parseSimulatorSearchParams(
      new URLSearchParams(searchParams.toString()),
    );
    if (parsed.setA) {
      setSetANumber(parsed.setA);
      const s = findSet(parsed.setA);
      if (s) setSetAName(s.name);
    }
    if (parsed.setB) {
      setSetBNumber(parsed.setB);
      const s = findSet(parsed.setB);
      if (s) setSetBName(s.name);
    }
    setCondA(parsed.condA);
    setCondB(parsed.condB);
    setAmount(String(parsed.invested || parsed.amount));
    setStartYear(parsed.startYear);
    setSingleMode(parsed.single);
    setCopiesA(String(parsed.copiesA));
    setCopiesB(String(parsed.copiesB));
    if (parsed.setA && (parsed.single || parsed.setB)) {
      runSimulation(
        parsed.setA,
        parsed.setB || parsed.setA,
        parsed.condA,
        parsed.condB,
        parsed.invested || parsed.amount,
        parsed.startYear,
        parsed.copiesA,
        parsed.copiesB,
        parsed.single,
      );
    }
    setUrlLoaded(true);
  }, [searchParams, urlLoaded, runSimulation]);

  const canSimulate = Boolean(setANumber.trim() && (singleMode || setBNumber.trim()));

  function handleSimulate() {
    const inv = parseFloat(amount);
    if (!Number.isFinite(inv) || inv <= 0) {
      setError("Enter a valid investment amount.");
      return;
    }
    if (!(SIMULATOR_START_YEARS as readonly number[]).includes(startYear)) {
      setError("Select a valid start year.");
      return;
    }
    runSimulation(
      setANumber.trim(),
      singleMode ? setANumber.trim() : setBNumber.trim(),
      condA,
      condB,
      inv,
      startYear,
      Math.min(10, Math.max(1, parseInt(copiesA || "1", 10))),
      Math.min(10, Math.max(1, parseInt(copiesB || "1", 10))),
      singleMode,
    );
  }

  function loadQuickBattle(battleId: string) {
    const qb = QUICK_BATTLES.find((b) => b.id === battleId);
    if (!qb) return;
    const inv = parseFloat(amount) || 1000;
    setSetANumber(qb.setA);
    setSetBNumber(qb.setB);
    setStartYear(qb.startYear);
    const sa = findSet(qb.setA);
    const sb = findSet(qb.setB);
    setSetAName(sa?.name ?? null);
    setSetBName(sb?.name ?? null);
    setSingleMode(false);
    runSimulation(qb.setA, qb.setB, condA, condB, inv, qb.startYear, parseInt(copiesA || "1", 10), parseInt(copiesB || "1", 10), false);
  }

  async function handleShare() {
    const inv = parseFloat(amount) || 1000;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${buildSimulatorHref({
            setA: setANumber,
            setB: setBNumber,
            condA: condA,
            condB: condB,
            amount: inv,
            invested: inv,
            startYear,
            single: singleMode,
            copiesA: parseInt(copiesA || "1", 10),
            copiesB: parseInt(copiesB || "1", 10),
          })}`
        : "";
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  async function handleCopySummary() {
    const active = singleResult ?? battle?.resultA;
    if (!active) return;
    try {
      await navigator.clipboard.writeText(
        formatSimulationSummary(active, { inflationAdjusted }),
      );
      setSummaryCopied(true);
      window.setTimeout(() => setSummaryCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  const amountNum = useMemo(() => parseFloat(amount) || 1000, [amount]);

  return (
    <div className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          Investment Battle Simulator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
          Simulate historical LEGO investment performance and compare returns
        </p>
        <p className="mt-3 inline-block rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
          Educational tool — based on estimated historical appreciation rates
        </p>
      </div>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSingleMode(true)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${singleMode ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#fbbf24]" : "border-white/10 text-zinc-400"}`}
          >
            Single Set
          </button>
          <button
            type="button"
            onClick={() => setSingleMode(false)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${!singleMode ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#fbbf24]" : "border-white/10 text-zinc-400"}`}
          >
            Head-to-Head
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={inflationAdjusted}
              onChange={(e) => setInflationAdjusted(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 accent-[#f59e0b]"
            />
            Show inflation-adjusted returns
          </label>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SimulatorSetPicker
            label="Set A"
            inputId="sim-set-a"
            setNumber={setANumber}
            setName={setAName}
            condition={condA}
            onSetNumberChange={setSetANumber}
            onSetResolved={(num, name) => {
              setSetANumber(num);
              setSetAName(name);
            }}
            onConditionChange={setCondA}
          />
          {!singleMode && (
          <SimulatorSetPicker
            label="Set B"
            inputId="sim-set-b"
            setNumber={setBNumber}
            setName={setBName}
            condition={condB}
            onSetNumberChange={setSetBNumber}
            onSetResolved={(num, name) => {
              setSetBNumber(num);
              setSetBName(name);
            }}
            onConditionChange={setCondB}
          />
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="sim-amount"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              If you invested ($ AUD)
            </label>
            <input
              id="sim-amount"
              type="number"
              min={1}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none focus:border-[#f59e0b]/60"
            />
          </div>
          <div>
            <label
              htmlFor="sim-year"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Start year
            </label>
            <select
              id="sim-year"
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value, 10))}
              className="touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none focus:border-[#f59e0b]/60"
            >
              {SIMULATOR_START_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sim-copies-a" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              How many copies? {singleMode ? "" : "(Set A)"}
            </label>
            <input id="sim-copies-a" type="number" min={1} max={10} value={copiesA} onChange={(e) => setCopiesA(e.target.value)} className="touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none focus:border-[#f59e0b]/60" />
          </div>
          {!singleMode && (
          <div>
            <label htmlFor="sim-copies-b" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              How many copies? (Set B)
            </label>
            <input id="sim-copies-b" type="number" min={1} max={10} value={copiesB} onChange={(e) => setCopiesB(e.target.value)} className="touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none focus:border-[#f59e0b]/60" />
          </div>
          )}
        </div>
        {inflationAdjusted && (
          <p className="mt-3 text-xs text-zinc-500">
            Adjusted for Australian CPI ~{AU_CPI_AVG}% per year
          </p>
        )}

        <button
          type="button"
          disabled={!canSimulate}
          onClick={handleSimulate}
          className="touch-target mt-6 w-full rounded-xl bg-[#f59e0b] py-3.5 text-sm font-bold text-zinc-900 transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-12"
        >
          Simulate →
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </section>

      {simulated && (battle || singleResult) && (
        <>
          <InvestmentBattleResults
            battle={battle}
            singleResult={singleResult}
            inflationAdjusted={inflationAdjusted}
            onShare={handleShare}
            onCopySummary={handleCopySummary}
            linkCopied={linkCopied}
            summaryCopied={summaryCopied}
          />
          <div className="mt-4">
            <Link
              href={`/benchmark?set=${encodeURIComponent((singleResult ?? battle?.resultA)?.setNumber ?? "")}&condition=${encodeURIComponent((singleResult ?? battle?.resultA)?.condition ?? "sealed")}&invested=${encodeURIComponent(String(amountNum))}&from=${encodeURIComponent(String(startYear))}`}
              className="touch-target inline-flex w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15 sm:w-auto sm:px-6"
            >
              Full Benchmark Comparison →
            </Link>
          </div>
        </>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-bold text-white">Quick battles</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Pre-loaded comparisons — tap to run the simulator
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_BATTLES.map((qb) => (
            <button
              key={qb.id}
              type="button"
              onClick={() => loadQuickBattle(qb.id)}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-left transition hover:border-[#f59e0b]/40 hover:bg-white/[0.04]"
            >
              <p className="font-semibold text-white">{qb.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{qb.subtitle}</p>
              <p className="mt-2 text-[10px] font-medium text-[#f59e0b]">
                From {qb.startYear} · ${amountNum.toLocaleString()} investment
              </p>
            </button>
          ))}
        </div>
      </section>

      <AppHeader
        title="Investment Battle Simulator"
        subtitle="BrickValue tools"
      />
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="page-main mx-auto max-w-5xl px-4 py-16 text-center text-zinc-500">
          Loading simulator…
        </div>
      }
    >
      <SimulatorPageContent />
    </Suspense>
  );
}
