"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { InvestmentBattleResults } from "@/components/InvestmentBattleResults";
import { SimulatorSetPicker } from "@/components/SimulatorSetPicker";
import {
  formatSimulationSummary,
  QUICK_BATTLES,
  runBattleSimulation,
  SIMULATOR_START_YEARS,
  type BattleComparison,
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
  const [simulated, setSimulated] = useState(false);
  const [battle, setBattle] = useState<BattleComparison | null>(null);
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
    ) => {
      router.replace(
        buildSimulatorHref({
          setA: a,
          setB: b,
          condA: ca,
          condB: cb,
          amount: inv,
          startYear: year,
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
    ) => {
      if (!findSet(a) || !findSet(b)) {
        setError("One or both sets were not found in the catalogue.");
        setBattle(null);
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
      });
      if (!result) {
        setError("Could not run simulation. Check set numbers and start year.");
        setBattle(null);
        setSimulated(false);
        return false;
      }
      setError("");
      setBattle(result);
      setSimulated(true);
      syncUrl(a, b, ca, cb, inv, year);
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
    setAmount(String(parsed.amount));
    setStartYear(parsed.startYear);
    if (parsed.setA && parsed.setB) {
      runSimulation(
        parsed.setA,
        parsed.setB,
        parsed.condA,
        parsed.condB,
        parsed.amount,
        parsed.startYear,
      );
    }
    setUrlLoaded(true);
  }, [searchParams, urlLoaded, runSimulation]);

  const canSimulate = Boolean(setANumber.trim() && setBNumber.trim());

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
      setBNumber.trim(),
      condA,
      condB,
      inv,
      startYear,
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
    runSimulation(qb.setA, qb.setB, condA, condB, inv, qb.startYear);
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
            startYear,
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
    if (!battle) return;
    try {
      await navigator.clipboard.writeText(formatSimulationSummary(battle));
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
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
        </div>

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

      {simulated && battle && (
        <InvestmentBattleResults
          battle={battle}
          onShare={handleShare}
          onCopySummary={handleCopySummary}
          linkCopied={linkCopied}
          summaryCopied={summaryCopied}
        />
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
