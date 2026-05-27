"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CompareSetPicker } from "@/components/CompareSetPicker";
import { SetImage } from "@/components/SetImage";
import { SetScarcityBadge } from "@/components/SetScarcityBadge";
import {
  isSetRetired,
  isSetRetiringSoon,
  type Condition,
} from "@/lib/analyze";
import { buildCompareHref, parseCompareSearchParams } from "@/lib/compare-url";
import { buildProfitCalculatorHref } from "@/lib/profit-calculator-url";
import {
  loadRecentComparisons,
  saveRecentComparison,
  type RecentComparison,
} from "@/lib/recent-comparisons";
import {
  buildComparedSet,
  buildComparisonVerdict,
  buildMetricRows,
  overallComparisonScore,
  sideLabel,
  type ComparedSetData,
  type CompareSide,
  type ComparisonMetricRow,
} from "@/lib/set-comparison";
import {
  addToWatchlist,
  isOnWatchlist,
  loadWatchlist,
} from "@/lib/watchlist";
import { useCurrency } from "@/src/lib/currencyContext";

function winnerCellClass(winner: CompareSide, side: "a" | "b"): string {
  if (winner === side) {
    return "bg-amber-500/10 border-l-2 border-amber-500/40";
  }
  return "";
}

function winnerCardClass(
  side: "a" | "b",
  overallWinner: CompareSide,
): string {
  const base =
    "rounded-2xl border bg-white/[0.03] p-4 sm:p-5 transition ";
  if (overallWinner === side) {
    return base + "border-amber-500/50 ring-1 ring-amber-500/20";
  }
  return base + "border-white/8";
}

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatPrice } = useCurrency();

  const [setANumber, setSetANumber] = useState("");
  const [setBNumber, setSetBNumber] = useState("");
  const [setAName, setSetAName] = useState<string | null>(null);
  const [setBName, setSetBName] = useState<string | null>(null);
  const [condA, setCondA] = useState<Condition>("sealed");
  const [condB, setCondB] = useState<Condition>("sealed");
  const [compared, setCompared] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [watchlistMsg, setWatchlistMsg] = useState("");
  const [recent, setRecent] = useState<RecentComparison[]>([]);
  const [urlLoaded, setUrlLoaded] = useState(false);

  const dataA = useMemo(
    () => (compared && setANumber ? buildComparedSet(setANumber, condA) : null),
    [compared, setANumber, condA],
  );
  const dataB = useMemo(
    () => (compared && setBNumber ? buildComparedSet(setBNumber, condB) : null),
    [compared, setBNumber, condB],
  );

  const metrics = useMemo(() => {
    if (!dataA || !dataB) return [];
    return buildMetricRows(dataA, dataB, formatPrice);
  }, [dataA, dataB, formatPrice]);

  const verdict = useMemo(() => {
    if (!dataA || !dataB) return null;
    return buildComparisonVerdict(dataA, dataB);
  }, [dataA, dataB]);

  const overallWinner = verdict?.overallWinner ?? "tie";
  const canCompare = Boolean(setANumber.trim() && setBNumber.trim());

  const syncUrl = useCallback(
    (a: string, b: string, ca: Condition, cb: Condition) => {
      router.replace(buildCompareHref({ setA: a, setB: b, condA: ca, condB: cb }), {
        scroll: false,
      });
    },
    [router],
  );

  const runCompare = useCallback(
    (a: string, b: string, ca: Condition, cb: Condition) => {
      const builtA = buildComparedSet(a, ca);
      const builtB = buildComparedSet(b, cb);
      if (!builtA || !builtB) return false;
      setCompared(true);
      syncUrl(a, b, ca, cb);
      const label = `${a} vs ${b}`;
      setRecent(
        saveRecentComparison({
          setA: a,
          setB: b,
          condA: ca,
          condB: cb,
          label,
        }),
      );
      return true;
    },
    [syncUrl],
  );

  useEffect(() => {
    setRecent(loadRecentComparisons());
  }, []);

  useEffect(() => {
    if (urlLoaded) return;
    const { setA, setB, condA: ca, condB: cb } = parseCompareSearchParams(
      new URLSearchParams(searchParams.toString()),
    );
    if (setA) {
      setSetANumber(setA);
      setCondA(ca);
      const built = buildComparedSet(setA, ca);
      if (built) setSetAName(built.analysis.set.name);
    }
    if (setB) {
      setSetBNumber(setB);
      setCondB(cb);
      const built = buildComparedSet(setB, cb);
      if (built) setSetBName(built.analysis.set.name);
    }
    if (setA && setB) {
      runCompare(setA, setB, ca, cb);
    }
    setUrlLoaded(true);
  }, [searchParams, urlLoaded, runCompare]);

  function handleCompare() {
    if (!canCompare) return;
    const ok = runCompare(setANumber.trim(), setBNumber.trim(), condA, condB);
    if (!ok) {
      setCompared(false);
    }
  }

  function handleSwap() {
    const nA = setANumber;
    const nB = setBNumber;
    const nameA = setAName;
    const nameB = setBName;
    const cA = condA;
    const cB = condB;
    setSetANumber(nB);
    setSetBNumber(nA);
    setSetAName(nameB);
    setSetBName(nameA);
    setCondA(cB);
    setCondB(cA);
    if (compared && nA && nB) {
      runCompare(nB, nA, cB, cA);
    }
  }

  function loadRecent(item: RecentComparison) {
    setSetANumber(item.setA);
    setSetBNumber(item.setB);
    setCondA(item.condA);
    setCondB(item.condB);
    const builtA = buildComparedSet(item.setA, item.condA);
    const builtB = buildComparedSet(item.setB, item.condB);
    setSetAName(builtA?.analysis.set.name ?? null);
    setSetBName(builtB?.analysis.set.name ?? null);
    runCompare(item.setA, item.setB, item.condA, item.condB);
  }

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${buildCompareHref({
            setA: setANumber,
            setB: setBNumber,
            condA,
            condB,
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

  function handleAddBothWatchlist() {
    if (!dataA || !dataB) return;
    let added = 0;
    for (const data of [dataA, dataB]) {
      const items = loadWatchlist();
      if (!isOnWatchlist(items, data.analysis.set.number)) {
        addToWatchlist({
          setNumber: data.analysis.set.number,
          name: data.analysis.set.name,
          theme: data.analysis.set.theme,
          recommendation: data.analysis.recommendation,
          recommendationAtAdd: data.analysis.recommendation,
          estimatedValue: data.analysis.estimatedValue,
          dateAdded: new Date().toISOString(),
          retiredAtAdd: isSetRetired(data.analysis.set),
          retiringSoonAtAdd: isSetRetiringSoon(data.analysis.set),
        });
        added++;
      }
    }
    setWatchlistMsg(
      added > 0
        ? `Added ${added} set${added === 1 ? "" : "s"} to watchlist`
        : "Both sets already on watchlist",
    );
    window.setTimeout(() => setWatchlistMsg(""), 3000);
  }

  return (
    <div className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          Compare Sets
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
          Compare two LEGO sets side by side to make smarter buy, sell and hold
          decisions.
        </p>
      </div>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CompareSetPicker
            label="Set A"
            inputId="compare-set-a"
            setNumber={setANumber}
            setName={setAName}
            condition={condA}
            onSetNumberChange={setSetANumber}
            onSetResolved={(num, name) => {
              setSetANumber(num);
              setSetAName(name);
            }}
            onConditionChange={setCondA}
            onClear={() => {
              setSetAName(null);
              setCompared(false);
            }}
          />
          <CompareSetPicker
            label="Set B"
            inputId="compare-set-b"
            setNumber={setBNumber}
            setName={setBName}
            condition={condB}
            onSetNumberChange={setSetBNumber}
            onSetResolved={(num, name) => {
              setSetBNumber(num);
              setSetBName(name);
            }}
            onConditionChange={setCondB}
            onClear={() => {
              setSetBName(null);
              setCompared(false);
            }}
          />
        </div>

        {recent.length > 0 && (
          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-xs font-medium text-zinc-500">Recent</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recent.map((item) => (
                <button
                  key={`${item.setA}-${item.setB}-${item.timestamp}`}
                  type="button"
                  onClick={() => loadRecent(item)}
                  className="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-[#f59e0b]/50 hover:text-[#fbbf24]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!canCompare}
            onClick={handleCompare}
            className="touch-target flex-1 rounded-xl bg-[#f59e0b] py-3.5 text-sm font-bold text-zinc-900 transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Compare →
          </button>
          <button
            type="button"
            disabled={!setANumber && !setBNumber}
            onClick={handleSwap}
            className="touch-target rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-[#f59e0b]/40 hover:text-white disabled:opacity-40"
          >
            Swap Sets
          </button>
          {compared && (
            <button
              type="button"
              onClick={handleShare}
              className="touch-target rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-[#f59e0b]/40"
            >
              {linkCopied ? "Link copied!" : "Share comparison"}
            </button>
          )}
        </div>
      </section>

      {compared && dataA && dataB && verdict && (
        <>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SetIdentityCard
              data={dataA}
              side="a"
              overallWinner={overallWinner}
            />
            <SetIdentityCard
              data={dataB}
              side="b"
              overallWinner={overallWinner}
            />
          </div>

          <ComparisonTable metrics={metrics} />

          <section className="mt-10 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>
                🏆
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
                  Overall winner
                </p>
                <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                  {verdict.headline}
                </h2>
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              {verdict.insights.map((insight) => (
                <li
                  key={insight}
                  className="flex items-start gap-2 text-sm leading-relaxed text-zinc-300"
                >
                  <span className="mt-1 shrink-0 text-[#f59e0b]" aria-hidden>
                    •
                  </span>
                  {insight}
                </li>
              ))}
            </ul>

            <div className="mt-8 space-y-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              <p>
                <span className="font-semibold text-white">
                  For immediate resale:
                </span>{" "}
                {sideLabel(verdict.resalePick)} —{" "}
                {verdict.resalePick === "a"
                  ? dataA.analysis.recommendation
                  : verdict.resalePick === "b"
                    ? dataB.analysis.recommendation
                    : "similar signals"}{" "}
                {verdict.resalePick !== "tie" && "recommendation"}
              </p>
              <p>
                <span className="font-semibold text-white">
                  For long-term hold:
                </span>{" "}
                {sideLabel(verdict.holdPick)} — stronger appreciation potential
              </p>
              <p>
                <span className="font-semibold text-white">
                  Diversification:
                </span>{" "}
                {verdict.diversificationNote}
              </p>
            </div>
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/results?set=${encodeURIComponent(dataA.analysis.set.number)}&condition=${condA}`}
              className="touch-target flex-1 rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-white transition hover:border-[#f59e0b]/50"
            >
              Analyse Set A →
            </Link>
            <Link
              href={`/results?set=${encodeURIComponent(dataB.analysis.set.number)}&condition=${condB}`}
              className="touch-target flex-1 rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-white transition hover:border-[#f59e0b]/50"
            >
              Analyse Set B →
            </Link>
            <button
              type="button"
              onClick={handleAddBothWatchlist}
              className="touch-target flex-1 rounded-xl border border-emerald-800/50 bg-emerald-950/20 py-3 text-sm font-semibold text-emerald-400 transition hover:border-emerald-500"
            >
              Add both to watchlist
            </button>
          </div>
          {watchlistMsg && (
            <p className="mt-2 text-center text-sm text-emerald-400">
              {watchlistMsg}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={buildProfitCalculatorHref({
                set: dataA.analysis.set.number,
                sellPrice: dataA.analysis.recommendedListPrice,
                buyPrice: dataA.analysis.estimatedValue,
                condition: condA,
              })}
              className="touch-target rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 py-3 text-center text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15"
            >
              Calculate profit — Set A
            </Link>
            <Link
              href={buildProfitCalculatorHref({
                set: dataB.analysis.set.number,
                sellPrice: dataB.analysis.recommendedListPrice,
                buyPrice: dataB.analysis.estimatedValue,
                condition: condB,
              })}
              className="touch-target rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 py-3 text-center text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15"
            >
              Calculate profit — Set B
            </Link>
          </div>
        </>
      )}

      {compared && (!dataA || !dataB) && (
        <p className="mt-8 text-center text-sm text-red-400" role="alert">
          One or both sets could not be found in the catalogue. Check set numbers
          and try again.
        </p>
      )}

      <AppHeader title="Compare Sets" subtitle="BrickValue tools" />
    </div>
  );
}

function SetIdentityCard({
  data,
  side,
  overallWinner,
}: {
  data: ComparedSetData;
  side: "a" | "b";
  overallWinner: CompareSide;
}) {
  const { analysis } = data;
  const retired = isSetRetired(analysis.set);
  const retiringSoon = isSetRetiringSoon(analysis.set);

  return (
    <article className={winnerCardClass(side, overallWinner)}>
      <SetImage
        setNumber={analysis.set.number}
        setName={analysis.set.name}
        variant="home"
      />
      <p className="mt-3 font-mono text-xs font-bold text-[#f59e0b]">
        #{analysis.set.number}
      </p>
      <h3 className="mt-1 text-lg font-bold text-white">{analysis.set.name}</h3>
      <span className="mt-2 inline-block rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
        {analysis.set.theme}
      </span>
      <div className="mt-2">
        <SetScarcityBadge set={analysis.set} size="compact" />
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        {analysis.set.year} · {analysis.set.pieces.toLocaleString()} pieces
      </p>
      <p className="mt-1 text-xs text-zinc-500 capitalize">
        {analysis.condition} condition
      </p>
      <p className="mt-3 text-lg font-bold text-[#fbbf24]">
        Score: {Math.round(overallComparisonScore(data))}
      </p>
      {(retired || retiringSoon) && (
        <p className="mt-2 text-xs font-semibold text-red-400">
          {retired ? "RETIRED" : "RETIRING SOON"}
        </p>
      )}
    </article>
  );
}

function ComparisonTable({ metrics }: { metrics: ComparisonMetricRow[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-white sm:text-xl">
        Metrics comparison
      </h2>
      <div className="mt-4 -mx-4 hidden overflow-x-auto px-4 md:block sm:mx-0 sm:px-0">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="py-3 pr-4 font-medium">Metric</th>
              <th className="py-3 px-2 text-center font-medium">Set A</th>
              <th className="w-10 py-3 px-1 text-center font-medium">vs</th>
              <th className="py-3 px-2 text-center font-medium">Set B</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, index) => (
              <tr
                key={row.id}
                className={
                  index % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"
                }
              >
                <td className="py-3 pr-4 font-medium text-zinc-400">
                  {row.label}
                </td>
                <td
                  className={`py-3 px-2 text-center tabular-nums text-white ${winnerCellClass(row.winner, "a")}`}
                >
                  {row.id === "recommendation" ? (
                    <RecBadge rec={row.valueA} />
                  ) : (
                    row.valueA
                  )}
                </td>
                <td className="py-3 text-center text-lg font-bold text-[#f59e0b]">
                  {row.vsIndicator}
                </td>
                <td
                  className={`py-3 px-2 text-center tabular-nums text-white ${winnerCellClass(row.winner, "b")}`}
                >
                  {row.id === "recommendation" ? (
                    <RecBadge rec={row.valueB} />
                  ) : (
                    row.valueB
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {metrics.map((row) => (
          <div
            key={`mobile-${row.id}`}
            className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
          >
            <p className="text-xs font-medium text-zinc-500">{row.label}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div
                className={`rounded-lg p-2 text-center ${winnerCellClass(row.winner, "a")}`}
              >
                <p className="text-[10px] text-zinc-500">Set A</p>
                {row.id === "recommendation" ? (
                  <RecBadge rec={row.valueA} />
                ) : (
                  <p className="font-medium text-white">{row.valueA}</p>
                )}
              </div>
              <div
                className={`rounded-lg p-2 text-center ${winnerCellClass(row.winner, "b")}`}
              >
                <p className="text-[10px] text-zinc-500">Set B</p>
                {row.id === "recommendation" ? (
                  <RecBadge rec={row.valueB} />
                ) : (
                  <p className="font-medium text-white">{row.valueB}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const isSell = rec === "SELL";
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
        isSell
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-[#f59e0b]/20 text-[#f59e0b]"
      }`}
    >
      {rec}
    </span>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="page-main mx-auto max-w-5xl px-4 py-16 text-center text-zinc-500">
          Loading comparison…
        </div>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}
