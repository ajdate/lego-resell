"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { OpportunityCard } from "@/components/OpportunityCard";
import { DEFAULT_LAST_UPDATED } from "@/lib/freshness";
import {
  getAllMarketOpportunities,
  getOpportunitiesSummary,
  type MarketOpportunityEntry,
} from "@/lib/market-opportunities";
import {
  getOpportunityTier,
  type BuySignal,
} from "@/lib/opportunityScoring";
import { loadPortfolio } from "@/lib/portfolio";
import { loadWatchlist } from "@/lib/watchlist";
import { CurrencyToggle } from "@/components/CurrencyToggle";

type BuyFilter = "all" | BuySignal;
type SortKey =
  | "score"
  | "roi12"
  | "roi24"
  | "value";

function formatLastUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function OpportunitiesPage() {
  const [entries] = useState<MarketOpportunityEntry[]>(() =>
    getAllMarketOpportunities(),
  );
  const [themeFilter, setThemeFilter] = useState("all");
  const [buyFilter, setBuyFilter] = useState<BuyFilter>("all");
  const [sort, setSort] = useState<SortKey>("score");
  const [lowExpanded, setLowExpanded] = useState(false);
  const [watchlistNumbers, setWatchlistNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [portfolioNumbers, setPortfolioNumbers] = useState<Set<string>>(
    new Set(),
  );

  const refreshStatus = useCallback(() => {
    setWatchlistNumbers(new Set(loadWatchlist().map((i) => i.setNumber)));
    setPortfolioNumbers(
      new Set(loadPortfolio().map((i) => i.setNumber)),
    );
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const themes = useMemo(() => {
    const set = new Set(entries.map((e) => e.set.theme));
    return ["all", ...[...set].sort()];
  }, [entries]);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (themeFilter !== "all") {
      list = list.filter((e) => e.set.theme === themeFilter);
    }
    if (buyFilter !== "all") {
      list = list.filter((e) => e.opportunity.buySignal === buyFilter);
    }
    switch (sort) {
      case "roi12":
        list.sort(
          (a, b) =>
            b.opportunity.projectedROI12m - a.opportunity.projectedROI12m,
        );
        break;
      case "roi24":
        list.sort(
          (a, b) =>
            b.opportunity.projectedROI24m - a.opportunity.projectedROI24m,
        );
        break;
      case "value":
        list.sort(
          (a, b) => b.analysis.estimatedValue - a.analysis.estimatedValue,
        );
        break;
      default:
        list.sort(
          (a, b) =>
            b.opportunity.opportunityScore - a.opportunity.opportunityScore,
        );
    }
    return list;
  }, [entries, themeFilter, buyFilter, sort]);

  const tiers = useMemo(() => {
    const exceptional = filtered.filter(
      (e) => getOpportunityTier(e.opportunity.opportunityScore) === "exceptional",
    );
    const strong = filtered.filter(
      (e) => getOpportunityTier(e.opportunity.opportunityScore) === "strong",
    );
    const watch = filtered.filter(
      (e) => getOpportunityTier(e.opportunity.opportunityScore) === "watch",
    );
    const low = filtered.filter(
      (e) => getOpportunityTier(e.opportunity.opportunityScore) === "low",
    );
    return { exceptional, strong, watch, low };
  }, [filtered]);

  const summary = useMemo(
    () => getOpportunitiesSummary(filtered),
    [filtered],
  );

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader
        title="Market Opportunities"
        subtitle="Sets identified as strong buying or holding opportunities"
      />

      <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-xs text-zinc-500">
          Last updated: {formatLastUpdated(DEFAULT_LAST_UPDATED)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">Opportunities identified</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {summary.total}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">Strong Buy / Buy signals</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {summary.strongBuyCount}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">Highest score</p>
            <p className="mt-1 truncate text-sm font-bold text-white">
              {summary.top?.set.name ?? "—"}
            </p>
            <p className="text-xs text-[#f59e0b]">
              {summary.top?.opportunity.opportunityScore ?? "—"}/100
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">Avg. projected 12m ROI</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              +{summary.avgRoi12m}%
            </p>
          </div>
        </div>

        <div className="filter-scroll mt-6 flex flex-col gap-3 overflow-x-auto pb-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:overflow-visible sm:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex shrink-0 flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:gap-2">
            Theme
            <select
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-white sm:w-auto sm:py-2 sm:text-sm"
            >
              {themes.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All themes" : t}
                </option>
              ))}
            </select>
          </label>
          <div className="flex shrink-0 gap-2">
            {(
              [
                ["all", "All"],
                ["Strong Buy", "Strong Buy"],
                ["Buy", "Buy"],
                ["Watch", "Watch"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBuyFilter(key)}
                className={`filter-chip shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
                  buyFilter === key
                    ? "bg-[#f59e0b] text-zinc-900"
                    : "border border-zinc-700 text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          </div>
          <CurrencyToggle className="shrink-0 self-start sm:self-center" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-full shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-white sm:w-auto sm:py-2 sm:text-sm"
          >
            <option value="score">Opportunity Score</option>
            <option value="roi12">Projected ROI 12m</option>
            <option value="roi24">Projected ROI 24m</option>
            <option value="value">Estimated Value</option>
          </select>
        </div>

        <div className="mt-8 space-y-10">
          {tiers.exceptional.length > 0 && (
            <section>
              <h2 className="rounded-lg bg-gradient-to-r from-red-500/20 to-[#f59e0b]/20 px-4 py-3 text-sm font-bold text-[#fbbf24]">
                🔥 Exceptional — Strong Buy Signal
              </h2>
              <ul className="mt-4 space-y-4">
                {tiers.exceptional.map((entry) => (
                  <OpportunityCard
                    key={entry.set.number}
                    entry={entry}
                    tier="exceptional"
                    inWatchlist={watchlistNumbers.has(entry.set.number)}
                    inPortfolio={portfolioNumbers.has(entry.set.number)}
                    onWatchlistChange={refreshStatus}
                    onPortfolioChange={refreshStatus}
                  />
                ))}
              </ul>
            </section>
          )}

          {tiers.strong.length > 0 && (
            <section>
              <h2 className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-[#fbbf24]">
                ⭐ Strong Opportunities
              </h2>
              <ul className="mt-4 space-y-4">
                {tiers.strong.map((entry) => (
                  <OpportunityCard
                    key={entry.set.number}
                    entry={entry}
                    tier="strong"
                    inWatchlist={watchlistNumbers.has(entry.set.number)}
                    inPortfolio={portfolioNumbers.has(entry.set.number)}
                    onWatchlistChange={refreshStatus}
                    onPortfolioChange={refreshStatus}
                  />
                ))}
              </ul>
            </section>
          )}

          {tiers.watch.length > 0 && (
            <section>
              <h2 className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-300">
                👀 Worth Watching
              </h2>
              <ul className="mt-4 space-y-4">
                {tiers.watch.map((entry) => (
                  <OpportunityCard
                    key={entry.set.number}
                    entry={entry}
                    tier="watch"
                    inWatchlist={watchlistNumbers.has(entry.set.number)}
                    inPortfolio={portfolioNumbers.has(entry.set.number)}
                    onWatchlistChange={refreshStatus}
                    onPortfolioChange={refreshStatus}
                  />
                ))}
              </ul>
            </section>
          )}

          {tiers.low.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setLowExpanded((e) => !e)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-left text-sm font-semibold text-zinc-400 transition hover:text-white"
              >
                {lowExpanded
                  ? "Hide low-opportunity sets"
                  : `Show ${tiers.low.length} low-opportunity sets`}
              </button>
              {lowExpanded && (
                <>
                  <h2 className="mt-4 text-sm font-bold text-zinc-500">
                    Low Opportunity — Skip or Wait
                  </h2>
                  <ul className="mt-4 space-y-4">
                    {tiers.low.map((entry) => (
                      <OpportunityCard
                        key={entry.set.number}
                        entry={entry}
                        tier="low"
                        inWatchlist={watchlistNumbers.has(entry.set.number)}
                        inPortfolio={portfolioNumbers.has(entry.set.number)}
                        onWatchlistChange={refreshStatus}
                        onPortfolioChange={refreshStatus}
                      />
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>

        {filtered.length === 0 && (
          <p className="mt-12 text-center text-sm text-zinc-500">
            No sets match the current filters.
          </p>
        )}
      </main>
    </div>
  );
}
