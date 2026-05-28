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
import { MarketSalesContextPanel } from "@/components/MarketSalesContextPanel";
import { RecommendationInsightPanel } from "@/components/RecommendationInsightPanel";
import { SimilarSetsSection } from "@/components/SimilarSetsSection";
import { DataFreshnessRow } from "@/components/DataFreshnessRow";
import { SetNotFoundExperience } from "@/components/SetNotFoundExperience";
import { SetImage } from "@/components/SetImage";
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
  isListingFormatsResponse,
  listingTextForTab,
  type ListingFormatsResponse,
} from "@/lib/listing-formats";
import {
  getListingTextForTab,
  recordListingShare,
  shareWithNativeOrClipboard,
} from "@/lib/listing-share";
import { buildCompareHref } from "@/lib/compare-url";
import { buildPortfolioFitHref } from "@/lib/portfolio-fit-url";
import { buildProfitCalculatorHref } from "@/lib/profit-calculator-url";
import { buildSimulatorHref } from "@/lib/simulator-url";
import {
  estimateRetirementYear,
  getRetirementImpactMetrics,
  projectValueYearsAhead,
  retirementProbabilityForActive,
  simulateInvestment,
} from "@/lib/investmentSimulator";
import {
  getCopyCountForSet,
  isInPortfolio,
  loadPortfolio,
} from "@/lib/portfolio";
import { PortfolioAddFlow } from "@/components/PortfolioAddFlow";
import { WaitlistPopup } from "@/components/WaitlistPopup";
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
  const [listings, setListings] = useState<ListingFormatsResponse | null>(
    null,
  );
  const [listingTab, setListingTab] = useState<"marketplace" | "ebay">(
    "marketplace",
  );
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState("");
  const [inPortfolio, setInPortfolio] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [justAddedWatchlist, setJustAddedWatchlist] = useState(false);
  const [portfolioCopyCount, setPortfolioCopyCount] = useState(0);
  const [listingCopyFeedback, setListingCopyFeedback] = useState<
    "marketplace" | "ebay" | ""
  >("");
  const [listingShareFeedback, setListingShareFeedback] = useState<{
    tab: "marketplace" | "ebay";
    message: string;
  } | null>(null);
  const [analysisShareFeedback, setAnalysisShareFeedback] = useState("");
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
    setListings(null);

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
    setListings(null);

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
      if (!isListingFormatsResponse(data)) {
        setListingError("Unexpected listing format from server.");
        return;
      }
      setListings(data);
      setListingTab("marketplace");
    } catch {
      setListingError("Failed to generate listing. Please try again.");
    } finally {
      setListingLoading(false);
    }
  }

  async function handleShareListing(tab: "marketplace" | "ebay") {
    if (!analysis || !listings) return;

    const listingText = getListingTextForTab(listings, tab);
    const title = `LEGO ${analysis.set.number} ${analysis.set.name} — ${conditionLabel(analysis.condition)}`;

    const result = await shareWithNativeOrClipboard({
      title,
      text: listingText,
      url: window.location.href,
      clipboardText: listingText,
    });

    if (result === "cancelled") return;

    recordListingShare(
      analysis.set.number,
      tab === "ebay" ? "ebay" : "marketplace",
    );

    setListingShareFeedback({
      tab,
      message:
        result === "shared"
          ? "Shared! ✓"
          : "Copied! Paste into your listing platform.",
    });
    window.setTimeout(() => setListingShareFeedback(null), 2000);
  }

  async function handleShareActiveListing() {
    await handleShareListing(listingTab);
  }

  async function handleShareAnalysis() {
    if (!analysis) return;

    const url = window.location.href;
    const text = `Check out this LEGO set analysis on BrickValue: ${url}`;

    const result = await shareWithNativeOrClipboard({
      title: `LEGO ${analysis.set.number} ${analysis.set.name}`,
      text,
      url,
    });

    if (result === "cancelled") return;

    recordListingShare(analysis.set.number, "analysis");

    setAnalysisShareFeedback(
      result === "shared" ? "Shared! ✓" : "Link copied!",
    );
    window.setTimeout(() => setAnalysisShareFeedback(""), 2000);
  }

  function copyListingText(tab: "marketplace" | "ebay") {
    if (!listings) return;
    const text = listingTextForTab(listings, tab);
    void navigator.clipboard.writeText(text).then(() => {
      setListingCopyFeedback(tab);
      window.setTimeout(() => setListingCopyFeedback(""), 2000);
    }).catch(() => {
      setListingCopyFeedback("");
    });
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
        <SetImage
          setNumber={analysis.set.number}
          setName={analysis.set.name}
          variant="hero"
        />

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
        <button
          type="button"
          onClick={() => void handleShareAnalysis()}
          className="touch-target mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-[#f59e0b]"
        >
          <span aria-hidden>↗</span>
          <span className="transition-opacity duration-200">
            {analysisShareFeedback || "Share Analysis ↗"}
          </span>
        </button>
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

        <div className="mt-5 flex flex-col gap-3">
          <Link
            href={buildCompareHref({
              setA: analysis.set.number,
              condA:
                analysis.condition === "damaged-box"
                  ? "sealed"
                  : analysis.condition,
            })}
            className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] py-3.5 text-sm font-semibold text-white transition hover:border-[#f59e0b]/40 hover:bg-white/[0.06]"
          >
            Compare with another set →
          </Link>
          <Link
            href={buildProfitCalculatorHref({
              set: analysis.set.number,
              sellPrice: analysis.recommendedListPrice,
              buyPrice: analysis.estimatedValue,
              condition: analysis.condition,
            })}
            className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 py-3.5 text-sm font-semibold text-[#fbbf24] transition hover:border-[#f59e0b] hover:bg-[#f59e0b]/20"
          >
            Calculate profit →
          </Link>
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
      <RetirementImpactSection analysis={analysis} />

      <div className="mt-4">
        <Link
          href={buildPortfolioFitHref({
            set: analysis.set.number,
            condition: analysis.condition as Condition,
          })}
          className="touch-target inline-flex w-full items-center justify-center rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 py-3 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15 sm:w-auto sm:px-6"
        >
          Check Portfolio Fit →
        </Link>
      </div>

      <MarketSalesContextPanel analysis={analysis} />

      <OpportunityScorePanel analysis={analysis} />
      <div className="mt-4">
        <Link
          href={buildSimulatorHref({
            setA: analysis.set.number,
            condA: analysis.condition === "complete" ? "complete" : "sealed",
            single: true,
            invested: analysis.estimatedValue,
          })}
          className="touch-target inline-flex w-full items-center justify-center rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 py-3 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15 sm:w-auto sm:px-6"
        >
          Simulate this investment →
        </Link>
      </div>

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

      {listings && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">Marketplace listing</h2>
              <button
                type="button"
                onClick={() => void handleShareActiveListing()}
                className="touch-target flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-white transition hover:border-[#f59e0b]/40 hover:text-[#f59e0b]"
                aria-label="Share current listing"
                title="Share listing"
              >
                <span aria-hidden>↗</span>
              </button>
            </div>
            <div
              className="flex rounded-lg border border-white/10 p-0.5"
              role="tablist"
              aria-label="Listing format"
            >
              <button
                type="button"
                role="tab"
                aria-selected={listingTab === "marketplace"}
                onClick={() => setListingTab("marketplace")}
                className={`touch-target rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  listingTab === "marketplace"
                    ? "bg-[#f59e0b] text-zinc-900"
                    : "bg-white/20 text-zinc-300 hover:text-white"
                }`}
              >
                Facebook Marketplace
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={listingTab === "ebay"}
                onClick={() => setListingTab("ebay")}
                className={`touch-target rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  listingTab === "ebay"
                    ? "bg-[#f59e0b] text-zinc-900"
                    : "bg-white/20 text-zinc-300 hover:text-white"
                }`}
              >
                eBay
              </button>
            </div>
          </div>

          {listingTab === "marketplace" ? (
            <ListingFormatPanel
              title={listings.marketplace.title}
              description={listings.marketplace.description}
            />
          ) : (
            <ListingFormatPanel
              title={listings.ebay.title}
              description={listings.ebay.description}
            />
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => copyListingText(listingTab)}
              className="touch-target min-w-[5.5rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#f59e0b]/40 sm:flex-none sm:min-w-0"
            >
              <span className="transition-opacity duration-200">
                {listingCopyFeedback === listingTab ? "Copied!" : "Copy All"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void handleShareListing(listingTab)}
              className="touch-target min-w-[5.5rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#f59e0b]/40 sm:flex-none sm:min-w-0"
            >
              <span className="transition-opacity duration-200">
                {listingShareFeedback?.tab === listingTab
                  ? listingShareFeedback.message
                  : (
                      <>
                        Share <span aria-hidden>↗</span>
                      </>
                    )}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => void generateListing()}
            disabled={listingLoading}
            className="touch-target mt-5 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-[#f59e0b]/50 hover:text-white disabled:opacity-50"
          >
            {listingLoading ? "Regenerating…" : "Regenerate listings"}
          </button>
        </div>
      )}

      <SimilarSetsSection setNumber={analysis.set.number} />

      <WaitlistPopup listingReady={Boolean(listings)} />
    </div>
  );
}

function RetirementImpactSection({ analysis }: { analysis: Analysis }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  const retirementYear = estimateRetirementYear(analysis.set);
  const sim = simulateInvestment(analysis.set.number, {
    initialInvestment: analysis.set.msrp,
    startYear: Math.max(2015, Math.min(retirementYear - 2, analysis.set.year)),
    condition: analysis.condition === "complete" ? "complete" : "sealed",
  });
  const impact = sim ? getRetirementImpactMetrics(sim) : null;
  const projectedAtRetirement =
    analysis.set.retired || analysis.set.retiringSoon
      ? impact?.estimatedRetirementValue ?? analysis.estimatedValue
      : projectValueYearsAhead(
          analysis.set.number,
          analysis.condition === "complete" ? "complete" : "sealed",
          analysis.estimatedValue,
          Math.max(1, retirementYear - new Date().getFullYear()),
        );
  const projected2YPost =
    analysis.set.retired
      ? impact?.estimatedTwoYearsPostValue ?? analysis.estimatedValue
      : projectValueYearsAhead(
          analysis.set.number,
          analysis.condition === "complete" ? "complete" : "sealed",
          analysis.estimatedValue,
          Math.max(2, retirementYear - new Date().getFullYear() + 2),
        );

  const isRetired = analysis.set.retired === true;
  const isRetiringSoon = analysis.set.retiringSoon === true && !isRetired;
  const isActive = !isRetired && !isRetiringSoon;
  const probability = isActive
    ? retirementProbabilityForActive(analysis.set.year)
    : null;

  return (
    <div
      className={`mt-5 rounded-2xl border p-5 ${
        isRetired
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isRetiringSoon
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-zinc-700 bg-zinc-900/50"
      }`}
    >
      <h3 className="text-sm font-bold uppercase tracking-wide text-[#f59e0b]">
        Retirement Impact
      </h3>
      {isRetired && impact && (
        <div className="mt-3 space-y-1.5 text-sm text-zinc-300">
          <p>This set retired in approximately {retirementYear}.</p>
          <p>Estimated retirement spike: +{impact.retirementSpikePercent}%.</p>
          <p>
            Post-retirement appreciation: ~{impact.postRetirementAvgPercent}% per year since retirement.
          </p>
          <p>
            Estimated holding premium vs pre-retirement sale: +{fmt(impact.holdingPremiumDollars)} (+{impact.holdingPremiumPercent}%).
          </p>
          <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
            ✦ You are in the post-retirement appreciation window
          </p>
        </div>
      )}
      {isRetiringSoon && (
        <div className="mt-3 space-y-1.5 text-sm text-zinc-300">
          <p>This set is approaching retirement.</p>
          <p>Based on historical patterns, retirement could add +25-40% in year one.</p>
          <p>Estimated value at retirement: ~{fmt(projectedAtRetirement)} AUD.</p>
          <p>Estimated value 2 years post-retirement: ~{fmt(projected2YPost)} AUD.</p>
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200">
            ⚠️ Pre-retirement window — historically the best time to accumulate
          </p>
        </div>
      )}
      {isActive && (
        <div className="mt-3 space-y-1.5 text-sm text-zinc-300">
          <p>This set is currently in production.</p>
          <p>Retirement typically triggers a 25-35% value increase for sets in this theme.</p>
          <p>
            Based on release year {analysis.set.year}, retirement could be{" "}
            {Math.max(0, retirementYear - new Date().getFullYear())} years away.
          </p>
          {probability && (
            <p className="mt-1">
              Retirement Probability:{" "}
              <span className={`font-semibold ${probability.colorClass}`}>
                {probability.label}
              </span>{" "}
              ({probability.reason}) · Estimated window: {probability.window}
            </p>
          )}
          <p className="mt-2 rounded-lg border border-zinc-600 bg-zinc-800/30 px-3 py-2 text-zinc-300">
            Monitor retirement announcements for this set
          </p>
        </div>
      )}
    </div>
  );
}

function ListingFormatPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Title
        </p>
        <p className="mt-1 text-base font-semibold text-white">{title}</p>
      </div>
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Description
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
          {description}
        </p>
      </div>
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
