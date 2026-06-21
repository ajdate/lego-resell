"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { PortfolioFitResults } from "@/components/PortfolioFitResults";
import { PortfolioFitSetPicker } from "@/components/PortfolioFitSetPicker";
import { DiversificationInsightsSection } from "@/components/DiversificationInsights";
import type { Condition } from "@/lib/analyze";
import { analyzeSet, findSet } from "@/lib/analyze";
import { computeDiversificationInsights } from "@/lib/diversification";
import {
  comparePortfolioFit,
  portfolioFitSetFromAnalysis,
  analysePortfolioFitFromCatalogue,
} from "@/lib/portfolioFit";
import {
  buildPortfolioFitHref,
  parsePortfolioFitSearchParams,
} from "@/lib/portfolio-fit-url";
import {
  computePortfolioMetrics,
  loadPortfolio,
  type PortfolioItem,
} from "@/lib/portfolio";
import { getDiversificationScoreStyles } from "@/lib/diversification";

function PortfolioFitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const [setNumber, setSetNumber] = useState("");
  const [setA, setSetA] = useState("");
  const [setB, setSetB] = useState("");
  const [setName, setSetName] = useState<string | null>(null);
  const [setAName, setSetAName] = useState<string | null>(null);
  const [setBName, setSetBName] = useState<string | null>(null);

  const [condition, setCondition] = useState<Condition>("sealed");
  const [condA, setCondA] = useState<Condition>("sealed");
  const [condB, setCondB] = useState<Condition>("sealed");

  const [price, setPrice] = useState("300");
  const [priceA, setPriceA] = useState("300");
  const [priceB, setPriceB] = useState("300");

  const [analysed, setAnalysed] = useState(false);
  const [singleResult, setSingleResult] = useState<
    ReturnType<typeof analysePortfolioFitFromCatalogue>
  >(null);
  const [compareResult, setCompareResult] = useState<ReturnType<
    typeof comparePortfolioFit
  > | null>(null);
  const [error, setError] = useState("");
  const [urlLoaded, setUrlLoaded] = useState(false);

  useEffect(() => {
    setPortfolio(loadPortfolio());
    setLoaded(true);
  }, []);

  const metrics = useMemo(
    () => (portfolio.length > 0 ? computePortfolioMetrics(portfolio) : null),
    [portfolio],
  );

  const diversification = useMemo(
    () => computeDiversificationInsights(portfolio),
    [portfolio],
  );

  const dominantWarning = useMemo(() => {
    if (!diversification) return null;
    const top = diversification.themeSegments[0];
    if (!top || top.percent <= 50) return null;
    return `⚠️ Your portfolio is heavily weighted toward ${top.theme} (${top.percent}%). Adding another ${top.theme} set increases concentration risk.`;
  }, [diversification]);

  const syncUrl = useCallback(
    (params: Parameters<typeof buildPortfolioFitHref>[0]) => {
      router.replace(buildPortfolioFitHref(params), { scroll: false });
    },
    [router],
  );

  const runAnalysis = useCallback(
    (
      opts: {
        compare: boolean;
        set?: string;
        setA?: string;
        setB?: string;
        condition?: Condition;
        condA?: Condition;
        condB?: Condition;
        price?: number;
        priceA?: number;
        priceB?: number;
      },
    ) => {
      if (opts.compare) {
        const a = opts.setA?.trim() ?? "";
        const b = opts.setB?.trim() ?? "";
        if (!a || !b) {
          setError("Select both sets to compare fit.");
          return false;
        }
        const analysisA = analyzeSet(a, opts.condA ?? "sealed");
        const analysisB = analyzeSet(b, opts.condB ?? "sealed");
        if (!analysisA || !analysisB) {
          setError("One or both sets not found in catalogue.");
          setAnalysed(false);
          return false;
        }
        const pA = opts.priceA ?? 0;
        const pB = opts.priceB ?? 0;
        const battle = comparePortfolioFit(
          portfolioFitSetFromAnalysis(analysisA),
          opts.condA ?? "sealed",
          pA > 0 ? pA : analysisA.estimatedValue,
          portfolioFitSetFromAnalysis(analysisB),
          opts.condB ?? "sealed",
          pB > 0 ? pB : analysisB.estimatedValue,
          portfolio,
        );
        setSingleResult(null);
        setCompareResult(battle);
        setAnalysed(true);
        setError("");
        syncUrl({
          compare: true,
          setA: a,
          setB: b,
          condA: opts.condA,
          condB: opts.condB,
          priceA: pA,
          priceB: pB,
        });
        return true;
      }

      const num = opts.set?.trim() ?? "";
      if (!num) {
        setError("Select a set to analyse.");
        return false;
      }
      const p = opts.price ?? 0;
      const result = analysePortfolioFitFromCatalogue(
        num,
        opts.condition ?? "sealed",
        p,
        portfolio,
      );
      if (!result) {
        setError("Set not found in catalogue.");
        setAnalysed(false);
        return false;
      }
      setCompareResult(null);
      setSingleResult(result);
      setAnalysed(true);
      setError("");
      syncUrl({
        set: num,
        condition: opts.condition,
        price: p,
      });
      return true;
    },
    [portfolio, syncUrl],
  );

  useEffect(() => {
    if (urlLoaded || !loaded) return;
    const parsed = parsePortfolioFitSearchParams(
      new URLSearchParams(searchParams.toString()),
    );
    if (parsed.compare) setCompareMode(true);
    if (parsed.set) {
      setSetNumber(parsed.set);
      const s = findSet(parsed.set);
      if (s) setSetName(s.name);
    }
    if (parsed.setA) {
      setSetA(parsed.setA);
      const s = findSet(parsed.setA);
      if (s) setSetAName(s.name);
    }
    if (parsed.setB) {
      setSetB(parsed.setB);
      const s = findSet(parsed.setB);
      if (s) setSetBName(s.name);
    }
    setCondition(parsed.condition);
    setCondA(parsed.condA);
    setCondB(parsed.condB);
    if (parsed.price > 0) setPrice(String(parsed.price));
    if (parsed.priceA > 0) setPriceA(String(parsed.priceA));
    if (parsed.priceB > 0) setPriceB(String(parsed.priceB));

    if (portfolio.length > 0) {
      if (parsed.compare && parsed.setA && parsed.setB) {
        runAnalysis({
          compare: true,
          setA: parsed.setA,
          setB: parsed.setB,
          condA: parsed.condA,
          condB: parsed.condB,
          priceA: parsed.priceA || undefined,
          priceB: parsed.priceB || undefined,
        });
      } else if (parsed.set) {
        runAnalysis({
          compare: false,
          set: parsed.set,
          condition: parsed.condition,
          price: parsed.price || undefined,
        });
      }
    }
    setUrlLoaded(true);
  }, [searchParams, urlLoaded, loaded, portfolio.length, runAnalysis]);

  function handleAnalyse() {
    if (compareMode) {
      const pA = parseFloat(priceA);
      const pB = parseFloat(priceB);
      runAnalysis({
        compare: true,
        setA,
        setB,
        condA,
        condB,
        priceA: Number.isFinite(pA) ? pA : 0,
        priceB: Number.isFinite(pB) ? pB : 0,
      });
    } else {
      const p = parseFloat(price);
      runAnalysis({
        compare: false,
        set: setNumber,
        condition,
        price: Number.isFinite(p) ? p : 0,
      });
    }
  }

  const priceNum = parseFloat(price) || 0;
  const priceANum = parseFloat(priceA) || 0;
  const priceBNum = parseFloat(priceB) || 0;

  if (!loaded) {
    return (
      <div className="page-main mx-auto max-w-5xl px-4 py-16 text-center text-zinc-500">
        Loading portfolio…
      </div>
    );
  }

  if (portfolio.length === 0) {
    return (
      <div className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            Portfolio Fit Analysis
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            See how a set fits your existing portfolio before you buy
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Based on your saved portfolio data
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
          <p className="text-lg text-zinc-300">
            Add sets to your portfolio first to use Portfolio Fit Analysis
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#f59e0b] px-6 py-3 text-sm font-bold text-zinc-900 hover:bg-[#fbbf24]"
          >
            Search sets →
          </Link>
        </div>
        <AppHeader title="Portfolio Fit" subtitle="BrickValue tools" />
      </div>
    );
  }

  return (
    <div className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          Portfolio Fit Analysis
        </h1>
        <p className="mt-2 text-sm text-zinc-400 sm:text-base">
          See how a set fits your existing portfolio before you buy
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Based on your saved portfolio data
        </p>
      </div>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#f59e0b]">
          Current portfolio snapshot
        </h2>
        {metrics && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-xs text-zinc-500">Sets / copies</p>
              <p className="mt-1 text-xl font-bold text-white">
                {metrics.uniqueSetCount} sets · {metrics.totalCopyCount}{" "}
                copies
              </p>
            </div>
            {diversification && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-xs text-zinc-500">Diversification</p>
                <p
                  className={`mt-1 text-xl font-bold ${getDiversificationScoreStyles(diversification.score).color}`}
                >
                  {diversification.score}/100
                </p>
              </div>
            )}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-xs text-zinc-500">Health score</p>
              <p className="mt-1 text-xl font-bold text-white">
                {metrics.healthScore}/10
              </p>
              <p className="text-xs text-zinc-500">{metrics.healthLabel}</p>
            </div>
          </div>
        )}
        {diversification && (
          <div className="mt-6">
            <DiversificationInsightsSection insights={diversification} />
          </div>
        )}
        {dominantWarning && (
          <p
            className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            role="alert"
          >
            {dominantWarning}
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-6">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => {
              setCompareMode(e.target.checked);
              setAnalysed(false);
              setSingleResult(null);
              setCompareResult(null);
            }}
            className="h-4 w-4 rounded border-zinc-600 accent-[#f59e0b]"
          />
          <span className="text-sm font-semibold text-white">
            Compare fit of two sets
          </span>
        </label>

        <div className="mt-6">
          {compareMode ? (
            <div className="grid gap-6 md:grid-cols-2">
              <PortfolioFitSetPicker
                label="Set A"
                inputId="fit-set-a"
                setNumber={setA}
                setName={setAName}
                condition={condA}
                purchasePrice={priceA}
                onSetNumberChange={setSetA}
                onSetResolved={(n, name) => {
                  setSetA(n);
                  setSetAName(name);
                }}
                onConditionChange={setCondA}
                onPurchasePriceChange={setPriceA}
              />
              <PortfolioFitSetPicker
                label="Set B"
                inputId="fit-set-b"
                setNumber={setB}
                setName={setBName}
                condition={condB}
                purchasePrice={priceB}
                onSetNumberChange={setSetB}
                onSetResolved={(n, name) => {
                  setSetB(n);
                  setSetBName(name);
                }}
                onConditionChange={setCondB}
                onPurchasePriceChange={setPriceB}
              />
            </div>
          ) : (
            <PortfolioFitSetPicker
              label="Set to analyse"
              inputId="fit-set"
              setNumber={setNumber}
              setName={setName}
              condition={condition}
              purchasePrice={price}
              onSetNumberChange={setSetNumber}
              onSetResolved={(n, name) => {
                setSetNumber(n);
                setSetName(name);
              }}
              onConditionChange={setCondition}
              onPurchasePriceChange={setPrice}
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleAnalyse}
          className="touch-target mt-6 w-full rounded-xl bg-[#f59e0b] py-3.5 text-sm font-bold text-zinc-900 hover:bg-[#fbbf24] sm:w-auto sm:px-12"
        >
          Analyse Fit →
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </section>

      {analysed && (
        <PortfolioFitResults
          result={singleResult}
          compareResult={compareResult}
          condition={condition}
          condA={condA}
          condB={condB}
          purchasePrice={priceNum}
          priceA={priceANum}
          priceB={priceBNum}
          portfolio={portfolio}
        />
      )}

      <AppHeader title="Portfolio Fit" subtitle="BrickValue tools" />
    </div>
  );
}

export default function PortfolioFitPage() {
  return (
    <Suspense
      fallback={
        <div className="page-main mx-auto max-w-5xl px-4 py-16 text-center text-zinc-500">
          Loading…
        </div>
      }
    >
      <PortfolioFitPageContent />
    </Suspense>
  );
}
