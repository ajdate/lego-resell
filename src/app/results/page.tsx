"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppHeader } from "@/components/AppHeader";
import { OpportunityScorePanel } from "@/components/OpportunityScorePanel";
import { RecommendationHistoryPanel } from "@/components/RecommendationHistoryPanel";
import { RecommendationInsightPanel } from "@/components/RecommendationInsightPanel";
import { SimilarSetsSection } from "@/components/SimilarSetsSection";
import { DataFreshnessRow } from "@/components/DataFreshnessRow";
import { SetNotFoundExperience } from "@/components/SetNotFoundExperience";
import { SetScarcityBadge } from "@/components/SetScarcityBadge";
import {
  DEFAULT_DATA_SOURCE,
  DEFAULT_LAST_UPDATED,
} from "@/lib/freshness";
import type { Analysis, Condition, PortfolioCondition } from "@/lib/analyze";
import {
  isSetRetired,
  isSetRetiringSoon,
} from "@/lib/analyze";
import {
  getCopyCountForSet,
  isInPortfolio,
  loadPortfolio,
} from "@/lib/portfolio";
import { PortfolioAddFlow } from "@/components/PortfolioAddFlow";
import { CurrencyAutoDetectBanner } from "@/components/CurrencyAutoDetectBanner";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { DualPrice } from "@/components/DualPrice";
import { ExchangeRateNote } from "@/components/ExchangeRateNote";
import { useCurrency } from "@/src/lib/currencyContext";
import {
  addToWatchlist,
  isOnWatchlist,
  loadWatchlist,
} from "@/lib/watchlist";

function conditionLabel(condition: PortfolioCondition) {
  if (condition === "damaged-box") return "Damaged box";
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const setParam = searchParams.get("set") ?? "";
  const conditionParam = searchParams.get("condition") ?? "sealed";
  const fromBrowse = searchParams.get("from") === "browse";
  const browseTheme = searchParams.get("theme") ?? "";

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setNotFound, setSetNotFound] = useState(false);
  const [listing, setListing] = useState("");
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState("");
  const [inPortfolio, setInPortfolio] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [justAddedWatchlist, setJustAddedWatchlist] = useState(false);
  const [portfolioCopyCount, setPortfolioCopyCount] = useState(0);
  const { formatPrice } = useCurrency();

  const fetchAnalysis = useCallback(async () => {
    if (!setParam) {
      setError("No set number provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSetNotFound(false);
    setListing("");

    try {
      const res = await fetch(
        `/api/sets?set=${encodeURIComponent(setParam)}&condition=${encodeURIComponent(conditionParam)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setSetNotFound(true);
          setError("");
        } else {
          setError(data.error ?? "Could not analyse this set.");
          setSetNotFound(false);
        }
        setAnalysis(null);
        return;
      }
      setAnalysis(data.analysis);
      setSetNotFound(false);
    } catch {
      setError("Failed to load analysis. Please try again.");
      setSetNotFound(false);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [setParam, conditionParam]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  useEffect(() => {
    if (!analysis) return;
    const items = loadPortfolio();
    const exists = isInPortfolio(
      items,
      analysis.set.number,
      analysis.condition,
    );
    setPortfolioCopyCount(getCopyCountForSet(items, analysis.set.number));
    setInPortfolio(exists);
    setJustAdded(false);
    setOnWatchlist(isOnWatchlist(loadWatchlist(), analysis.set.number));
    setJustAddedWatchlist(false);
  }, [analysis]);

  function handleAddToWatchlist() {
    if (!analysis || onWatchlist) return;

    addToWatchlist({
      setNumber: analysis.set.number,
      name: analysis.set.name,
      theme: analysis.set.theme,
      recommendation: analysis.recommendation,
      recommendationAtAdd: analysis.recommendation,
      estimatedValue: analysis.estimatedValue,
      dateAdded: new Date().toISOString(),
      retiredAtAdd: isSetRetired(analysis.set) ? true : false,
      retiringSoonAtAdd: isSetRetiringSoon(analysis.set),
    });

    setOnWatchlist(true);
    setJustAddedWatchlist(true);
  }

  async function generateListing() {
    if (!analysis) return;

    setListingLoading(true);
    setListingError("");
    setListing("");

    try {
      const res = await fetch("/api/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setNumber: analysis.set.number,
          setName: analysis.set.name,
          theme: analysis.set.theme,
          year: analysis.set.year,
          pieces: analysis.set.pieces,
          condition: analysis.condition,
          estimatedValue: analysis.estimatedValue,
          recommendedListPrice: analysis.recommendedListPrice,
          recommendation: analysis.recommendation,
          reasoning: analysis.reasoning,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setListingError(data.error ?? "Failed to generate listing.");
        return;
      }
      setListing(data.listing);
    } catch {
      setListingError("Failed to generate listing. Please try again.");
    } finally {
      setListingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-zinc-500">Analysing set…</p>
      </div>
    );
  }

  if (setNotFound) {
    return <SetNotFoundExperience setNumber={setParam} />;
  }

  if (error || !analysis) {
    return (
      <div className="page-main mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-[#f59e0b]">{error || "Something went wrong."}</p>
          <Link
            href="/"
            className="mt-6 inline-block text-[#f2cd00] hover:underline"
          >
            ← Back to search
          </Link>
        </div>
      </div>
    );
  }

  const isRetired = isSetRetired(analysis.set);
  const isRetiringSoon = isSetRetiringSoon(analysis.set);
  const showScarcity = isRetired || isRetiringSoon;
  const retirementUplift = analysis.roiPercent;
  const retirementMultiplier = (
    analysis.estimatedValue / analysis.set.msrp
  ).toFixed(1);

  return (
    <div className="page-main mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {fromBrowse && browseTheme ? (
          <Link
            href={`/browse?theme=${encodeURIComponent(browseTheme)}`}
            className="text-sm text-zinc-500 transition hover:text-[#f2cd00]"
          >
            ← Back to Browse
          </Link>
        ) : (
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-[#f2cd00]"
          >
            ← New search
          </Link>
        )}
        <CurrencyToggle className="self-start sm:self-auto" />
      </div>

      <CurrencyAutoDetectBanner />

      <div
        className={`mt-6 rounded-2xl border p-6 transition-colors ${
          isRetired
            ? "border-red-900/50 bg-red-950/20 shadow-[0_0_32px_-8px_rgba(153,27,27,0.35)]"
            : isRetiringSoon
              ? "border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] shadow-[0_0_32px_-8px_rgba(245,158,11,0.25)]"
              : "border-zinc-800 bg-zinc-900/50"
        }`}
      >
        {showScarcity && (
          <div className="mb-5">
            <SetScarcityBadge set={analysis.set} size="large" />
          </div>
        )}

        <p className="text-sm font-medium text-zinc-500">
          #{analysis.set.number} · {analysis.set.theme} · {analysis.set.year}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
          {analysis.set.name}
        </h1>
        <p className="mt-2 text-zinc-400">
          {analysis.set.pieces.toLocaleString()} pieces ·{" "}
          {conditionLabel(analysis.condition)} condition
          {isRetired && (
            <span className="ml-2 font-medium text-red-400">
              · No longer in production
            </span>
          )}
          {isRetiringSoon && (
            <span className="ml-2 font-medium text-[#f59e0b]">
              · Expected to retire in 6–12 months
            </span>
          )}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Estimated value">
            <DualPrice audAmount={analysis.estimatedValue} size="lg" />
          </StatCard>
          <StatCard label="Recommended list price" highlight>
            <DualPrice
              audAmount={analysis.recommendedListPrice}
              size="lg"
              className="[&_p:first-child]:text-[#f2cd00]"
            />
          </StatCard>
        </div>

        <ExchangeRateNote />

        <DataFreshnessRow
          setNumber={analysis.set.number}
          lastUpdated={analysis.set.lastUpdated ?? DEFAULT_LAST_UPDATED}
          dataSource={analysis.set.dataSource ?? DEFAULT_DATA_SOURCE}
        />
      </div>

      {showScarcity && (
        <div
          className={`mt-6 rounded-2xl border p-6 ${
            isRetired
              ? "border-red-900/40 bg-red-950/20"
              : "border-[#f59e0b]/30 bg-[#f59e0b]/[0.04]"
          }`}
        >
          <h2
            className={`text-lg font-bold ${
              isRetired ? "text-red-400" : "text-[#fbbf24]"
            }`}
          >
            Scarcity Insight
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {isRetired
              ? "This set is no longer in production. Retired sets typically appreciate 20–60% in the first 3 years. Scarcity increases over time as stock depletes."
              : "This set is expected to retire within 6–12 months. Buying now and holding through retirement is a proven LEGO investment strategy. Post-retirement premiums typically begin within 3–6 months."}
          </p>
          {isRetired && (
            <div className="mt-5 rounded-xl border border-red-900/30 bg-zinc-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Retirement Bonus
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                +{retirementUplift}%{" "}
                <span className="text-base font-normal text-zinc-400">
                  vs RRP ({formatPrice(analysis.set.msrp)})
                </span>
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {conditionLabel(analysis.condition)} condition:{" "}
                {formatPrice(analysis.estimatedValue)} estimated (
                {retirementMultiplier}× retail)
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500"
                  style={{
                    width: `${Math.min(100, Math.max(8, retirementUplift))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <RecommendationInsightPanel analysis={analysis} />

      <OpportunityScorePanel analysis={analysis} />

      <RecommendationHistoryPanel analysis={analysis} />

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <PortfolioAddFlow
          analysis={analysis}
          onAdded={(count) => {
            setPortfolioCopyCount(count);
            setInPortfolio(true);
            setJustAdded(true);
          }}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        {onWatchlist ? (
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <span className="w-full rounded-xl border border-zinc-600 bg-zinc-950/60 py-3 text-center text-sm font-semibold text-zinc-300 sm:flex-1">
              {justAddedWatchlist ? "✓ Added to Watch List" : "✓ On Watch List"}
            </span>
            <Link
              href="/watchlist"
              className="text-sm text-zinc-400 transition hover:text-white hover:underline"
            >
              View Watch List →
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToWatchlist}
            className="touch-target w-full rounded-xl border border-zinc-500 bg-transparent py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-zinc-800/80"
          >
            Add to Watch List
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={generateListing}
        disabled={listingLoading}
        className="touch-target mt-8 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3.5 font-medium text-white transition hover:border-[#f2cd00] hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {listingLoading ? "Generating listing with Claude…" : "Generate marketplace listing"}
      </button>

      {listingError && (
        <p className="mt-4 text-sm text-[#d01012]" role="alert">
          {listingError}
        </p>
      )}

      {listing && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Marketplace listing</h2>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(listing)}
              className="text-sm text-[#f2cd00] hover:underline"
            >
              Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
            {listing}
          </pre>
        </div>
      )}

      <SimilarSetsSection setNumber={analysis.set.number} />
    </div>
  );
}

function StatCard({
  label,
  highlight,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-[#f2cd00]/40 bg-[#f2cd00]/5"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Analysis results" subtitle="BrickValue" />

      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-24">
            <p className="text-zinc-500">Loading…</p>
          </div>
        }
      >
        <ResultsContent />
      </Suspense>
    </div>
  );
}
