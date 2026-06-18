"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { Condition, PortfolioCondition } from "@/lib/analyze";
import {
  computeGroupedSetPerformances,
  computePortfolioMetrics,
  formatPortfolioExportSummary,
  loadPortfolio,
  sortGroupedPerformancesByDollars,
  sortGroupedPerformancesByPercent,
  type GroupedSetPerformance,
  type HealthLabel,
  type PortfolioItem,
} from "@/lib/portfolio";
import {
  DiversificationInsightsSection,
  DiversificationScoreCard,
} from "@/components/DiversificationInsights";
import { PortfolioIntentDashboard } from "@/components/PortfolioIntentDashboard";
import { PortfolioSetList } from "@/components/PortfolioSetList";
import {
  filterPortfolioByIntent,
  INTENT_FILTER_OPTIONS,
  type IntentFilterKey,
} from "@/lib/portfolio-intent";
import { computeDiversificationInsights } from "@/lib/diversification";
import {
  daysSince,
  formatSnapshotDate,
  getPortfolioDirection,
  healthScoreColorClass,
  loadSnapshots,
  recordSnapshotIfDue,
  resetSnapshots,
  trendArrow,
  type PortfolioDirection,
  type PortfolioSnapshot,
} from "@/lib/portfolio-snapshots";
import {
  detectRecommendationChanges,
  loadLastSeenRecommendations,
  loadWatchlist,
  saveLastSeenRecommendations,
  type RecommendationChange,
  type RecommendationMap,
} from "@/lib/watchlist";
import { AppHeader } from "@/components/AppHeader";
import { AuthSignInPrompt } from "@/components/AuthSignInPrompt";
import { UserGoalChip } from "@/components/UserGoalChip";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { useCurrency } from "@/src/lib/currencyContext";
import {
  getPortfolioGrowthPercent,
  saveGrowthSnapshot,
} from "@/lib/growthTracking";
import {
  opportunitySetFromLego,
  scoreOpportunity,
} from "@/lib/opportunityScoring";
import { analyzeSet, findSet } from "@/lib/analyze";
import {
  calculateConfidence,
  getConfidenceBand,
  getConfidenceStyling,
  setDataFromLegoSet,
} from "@/lib/confidence";
import {
  DEFAULT_LAST_UPDATED,
  getFreshnessLabel,
  getSetFreshness,
} from "@/lib/freshness";
import { supabaseAdmin } from "@/src/lib/supabase-client";

function toSupabasePortfolioItem(
  userId: string,
  item: PortfolioItem | Record<string, unknown>,
) {
  const record = item as Record<string, unknown>;
  const copies = Array.isArray(record.copies) ? record.copies : [];
  const firstCopy = (copies[0] ?? {}) as Record<string, unknown>;

  return {
    user_id: userId,
    set_number: String(record.setNumber || record.set_number || ""),
    set_name: String(record.name || record.set_name || ""),
    purchase_price: Number(
      record.pricePaid ||
        record.purchase_price ||
        record.purchasePrice ||
        firstCopy.purchasePrice ||
        0,
    ),
    condition: String(record.condition || firstCopy.condition || "sealed"),
    intent: String(
      record.intent ||
        record.intentTag ||
        firstCopy.intent ||
        firstCopy.intentTag ||
        "undecided",
    ),
    notes: JSON.stringify(item),
  };
}

function portfolioItemFromSupabaseRow(
  row: Record<string, unknown>,
): PortfolioItem | null {
  const notes = row.notes;
  if (typeof notes !== "string" || !notes) return null;

  try {
    if (notes.startsWith("__bv1:")) {
      return JSON.parse(notes.slice("__bv1:".length)) as PortfolioItem;
    }
    return JSON.parse(notes) as PortfolioItem;
  } catch {
    return null;
  }
}

async function savePortfolioItemToSupabase(
  userId: string | undefined,
  item: PortfolioItem | Record<string, unknown>,
) {
  const supabaseItem = toSupabasePortfolioItem(userId ?? "", item);
  console.log("Attempting Supabase save:", {
    userId,
    item,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  const { data, error } = await supabaseAdmin
    .from("portfolio")
    .upsert(supabaseItem, { onConflict: "user_id,set_number" });
  console.log("Supabase result:", { data, error });
  if (error) console.error("Supabase save error:", error);
}

function conditionLabel(condition: PortfolioCondition) {
  if (condition === "damaged-box") return "Damaged box";
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function healthStyles(label: HealthLabel) {
  switch (label) {
    case "Excellent":
      return {
        border: "border-emerald-800/50",
        bg: "bg-emerald-950/30",
        score: "text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-400",
      };
    case "Good":
      return {
        border: "border-[#f59e0b]/40",
        bg: "bg-[#f59e0b]/5",
        score: "text-[#f59e0b]",
        badge: "bg-[#f59e0b]/20 text-[#f59e0b]",
      };
    case "Fair":
      return {
        border: "border-orange-800/50",
        bg: "bg-orange-950/20",
        score: "text-orange-400",
        badge: "bg-orange-500/20 text-orange-400",
      };
    case "Needs Attention":
      return {
        border: "border-red-900/50",
        bg: "bg-red-950/30",
        score: "text-red-400",
        badge: "bg-red-500/20 text-red-400",
      };
  }
}

export default function PortfolioPage() {
  const { user } = useUser();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [recommendationChanges, setRecommendationChanges] = useState<
    RecommendationChange[]
  >([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [intentFilter, setIntentFilter] = useState<IntentFilterKey>("all");

  useEffect(() => {
    const portfolio = loadPortfolio();
    setItems(portfolio);
    saveGrowthSnapshot(portfolio);
    setLoaded(true);

    const watchlist = loadWatchlist();
    if (watchlist.length === 0) return;

    const lastSeen = loadLastSeenRecommendations();

    fetch("/api/watchlist-check")
      .then((res) => res.json())
      .then((data: { recommendations?: RecommendationMap }) => {
        const current = data.recommendations ?? {};
        const changes = detectRecommendationChanges(
          watchlist,
          lastSeen,
          current,
        );
        setRecommendationChanges(changes);
        saveLastSeenRecommendations(current);
      })
      .catch(() => {
        setRecommendationChanges([]);
      });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    console.log("Loading portfolio for user:", user?.id);

    // Load from Supabase when signed in
    supabaseAdmin
      .from("portfolio")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("Supabase load error:", error);
        if (data && data.length > 0) {
          // Supabase has data - use it
          console.log("Loaded from Supabase:", data.length, "items");
          const parsed = data
            .map((row) => portfolioItemFromSupabaseRow(row))
            .filter((item): item is PortfolioItem => item !== null);
          if (parsed.length > 0) {
            setItems(parsed);
            saveGrowthSnapshot(parsed);
          }
        } else {
          // No Supabase data - check localStorage and migrate
          const local = localStorage.getItem("lego-portfolio");
          if (local) {
            const itemsToMigrate = JSON.parse(local) as PortfolioItem[];
            if (itemsToMigrate.length > 0) {
              console.log(
                "Migrating localStorage to Supabase:",
                itemsToMigrate.length,
                "items",
              );
              // Save to Supabase
              itemsToMigrate.forEach((item) => {
                void savePortfolioItemToSupabase(user.id, item);
              });
            }
          }
        }
      });
  }, [user?.id]);

  const metrics = useMemo(
    () => (items.length > 0 ? computePortfolioMetrics(items) : null),
    [items],
  );

  useEffect(() => {
    if (!loaded) return;
    if (metrics && items.length > 0) {
      setSnapshots(recordSnapshotIfDue(metrics));
    } else {
      setSnapshots(loadSnapshots());
    }
  }, [loaded, metrics, items.length]);

  const groupedPerformances = useMemo(
    () => (items.length >= 2 ? computeGroupedSetPerformances(items) : []),
    [items],
  );

  const freshnessSummary = useMemo(() => {
    const counts = { Fresh: 0, Recent: 0, Aging: 0, Outdated: 0 };
    for (const item of items) {
      const set = findSet(item.setNumber);
      const lastUpdated = set?.lastUpdated ?? DEFAULT_LAST_UPDATED;
      const label = getFreshnessLabel(getSetFreshness(lastUpdated).days);
      counts[label as keyof typeof counts]++;
    }
    const staleCount = counts.Aging + counts.Outdated;
    return { counts, staleCount };
  }, [items]);

  const diversification = useMemo(
    () => computeDiversificationInsights(items),
    [items],
  );

  const filteredItems = useMemo(
    () => filterPortfolioByIntent(items, intentFilter),
    [items, intentFilter],
  );

  const confidenceSummary = useMemo(() => {
    if (items.length === 0) return null;
    const scores: number[] = [];
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const item of items) {
      const analysis = analyzeSet(item.setNumber, item.condition);
      if (!analysis) continue;
      const result = calculateConfidence(
        setDataFromLegoSet(
          analysis.set,
          analysis.recommendation,
          analysis.estimatedValue,
        ),
        item.condition,
      );
      scores.push(result.score);
      const band = getConfidenceBand(result.score);
      if (band === "high") high += 1;
      else if (band === "medium") medium += 1;
      else low += 1;
    }

    if (scores.length === 0) return null;
    const average = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / scores.length,
    );
    return { average, high, medium, low, total: scores.length };
  }, [items]);

  function handlePortfolioUpdate(next: PortfolioItem[]) {
    const prevBySet = new Map(items.map((item) => [item.setNumber, item]));
    const nextBySet = new Map(next.map((item) => [item.setNumber, item]));

    for (const [setNumber] of prevBySet) {
      if (!nextBySet.has(setNumber)) {
        if (user?.id) {
          supabaseAdmin
            .from("portfolio")
            .delete()
            .eq("set_number", setNumber)
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Supabase delete error:", error);
            });
        }
      }
    }

    for (const [setNumber, newItem] of nextBySet) {
      const prevItem = prevBySet.get(setNumber);
      if (
        !prevItem ||
        JSON.stringify(prevItem) !== JSON.stringify(newItem)
      ) {
        if (user?.id) {
          void savePortfolioItemToSupabase(user.id, newItem);
        }
      }
    }

    setItems(next);
    saveGrowthSnapshot(next);
  }

  function handleCopySummary() {
    const exportItems =
      intentFilter === "all" ? items : filteredItems;
    const text = formatPortfolioExportSummary(exportItems);
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopyFeedback("Copied to clipboard");
        setTimeout(() => setCopyFeedback(""), 2000);
      })
      .catch(() => {
        setCopyFeedback("Could not copy — check browser permissions");
        setTimeout(() => setCopyFeedback(""), 2500);
      });
  }

  return (
    <AuthSignInPrompt
      emoji="📊"
      title="Sign in to track your portfolio"
      description="Your collection data syncs across all your devices"
    >
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader title="Portfolio" subtitle="Track your LEGO collection" />

      <main className="page-main mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-zinc-500">
              {loaded && items.length > 0
                ? `${items.length} ${items.length === 1 ? "set" : "sets"} tracked`
                : "Track value and intent per copy"}
            </p>
            <UserGoalChip />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {loaded && items.length > 0 && (
              <Link
                href="/portfolio/analytics"
                className="touch-target rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15"
              >
                View Analytics →
              </Link>
            )}
            <CurrencyToggle />
          </div>
        </div>

        {loaded && recommendationChanges.length > 0 && (
          <ChangesSinceLastVisitBanner changes={recommendationChanges} />
        )}

        {loaded && items.length > 0 && metrics && (
          <div className="flex w-full min-w-0 flex-col gap-4">
            <div className="flex w-full min-w-0 flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
              <HealthScoreCard metrics={metrics} />
              <GrowthStatCard />
              <PortfolioOpportunityIndexCard items={items} />
            </div>

            {metrics.concentrationWarnings.length > 0 && (
              <ConcentrationDashboard warnings={metrics.concentrationWarnings} />
            )}

            {freshnessSummary.staleCount > 0 && (
              <div
                className="w-full rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] px-5 py-4 text-sm text-[#fbbf24]"
                role="alert"
              >
                ⚠️ {freshnessSummary.staleCount} set
                {freshnessSummary.staleCount === 1 ? "" : "s"} in your portfolio
                have pricing data older than 30 days. Consider refreshing your
                analysis.
              </div>
            )}

            <div className="flex w-full min-w-0 flex-col gap-4 md:grid md:grid-cols-2">
              <ValueCard metrics={metrics} />
              <SellHoldBarCard metrics={metrics} />
            </div>

            <PortfolioIntentDashboard items={items} />

            <PortfolioConfidenceCard summary={confidenceSummary} />
            <DataFreshnessSummaryCard counts={freshnessSummary.counts} />

            <div className="flex w-full min-w-0 flex-col gap-4 md:grid md:grid-cols-2">
              <ThemeBreakdownCard metrics={metrics} />
              <PerformanceCard metrics={metrics} />
            </div>

            {diversification && (
              <DiversificationScoreCard insights={diversification} />
            )}

            {groupedPerformances.length >= 2 && (
              <PerformanceLeaderboard performances={groupedPerformances} />
            )}

            {snapshots.length >= 1 && (
              <PortfolioTrend
                snapshots={snapshots}
                onReset={() => setSnapshots(resetSnapshotsAndReload())}
              />
            )}

            {diversification && (
              <DiversificationInsightsSection insights={diversification} />
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/portfolio/recommendations"
                className="touch-target flex flex-1 items-center justify-center rounded-xl bg-[#f59e0b] py-3.5 text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
              >
                Get Recommendations
              </Link>
              <Link
                href="/portfolio-fit"
                className="touch-target flex flex-1 items-center justify-center rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 py-3.5 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15"
              >
                Find sets that fit →
              </Link>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Filter by intent
              </h3>
              <div className="filter-scroll mt-2 flex gap-2 overflow-x-auto pb-1">
                {INTENT_FILTER_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIntentFilter(key)}
                    className={`filter-chip shrink-0 rounded-lg px-3 text-xs font-medium transition ${
                      intentFilter === key
                        ? "bg-[#f59e0b]/20 text-[#f59e0b] ring-1 ring-[#f59e0b]/40"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Your sets
                {intentFilter !== "all" && (
                  <span className="ml-2 normal-case text-zinc-600">
                    ({filteredItems.length} matching)
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {copyFeedback && (
                  <span className="text-xs text-emerald-400">{copyFeedback}</span>
                )}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
                >
                  Copy summary
                </button>
              </div>
            </div>
            <div>
              <PortfolioSetList
                items={filteredItems}
                onUpdate={handlePortfolioUpdate}
              />
            </div>
          </div>
        )}

        {loaded && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-16 text-center">
            <p className="text-4xl">📦</p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No sets in your portfolio yet
            </h2>
            <p className="mt-2 max-w-sm text-zinc-400">
              Analyse a set and add it from the results page to track value and
              profit over time.
            </p>
            <Link
              href="/"
              className="mt-6 rounded-xl bg-[#f59e0b] px-6 py-3 font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
            >
              Search sets
            </Link>
          </div>
        )}

        {!loaded && (
          <p className="py-24 text-center text-zinc-500">Loading portfolio…</p>
        )}
      </main>
    </div>
    </AuthSignInPrompt>
  );
}

type SortMode = "percent" | "dollars";

function useMoneyFormat() {
  const { formatPrice, formatDualLine } = useCurrency();
  function formatGainLoss(amount: number, signed = true) {
    const prefix = signed && amount > 0 ? "+" : "";
    return `${prefix}${formatPrice(amount)}`;
  }
  return { formatPrice, formatDualLine, formatGainLoss };
}

function formatPercent(pct: number, signed = true) {
  const prefix = signed && pct > 0 ? "+" : "";
  return `${prefix}${pct}%`;
}

function ThemeBadge({ theme }: { theme: string }) {
  return (
    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
      {theme}
    </span>
  );
}

function PerformanceLeaderboard({
  performances,
}: {
  performances: GroupedSetPerformance[];
}) {
  const { formatPrice, formatGainLoss } = useMoneyFormat();
  const [sortMode, setSortMode] = useState<SortMode>("percent");

  const byPercent = useMemo(
    () => sortGroupedPerformancesByPercent(performances),
    [performances],
  );
  const byDollars = useMemo(
    () => sortGroupedPerformancesByDollars(performances),
    [performances],
  );

  const topPerformers = byPercent.slice(0, 3);
  const needsAttention = [...performances]
    .sort((a, b) => a.percentGain - b.percentGain)
    .slice(0, 3);

  const tableRows =
    sortMode === "percent" ? byPercent : byDollars;

  const inProfit = performances.filter((p) => p.profitDollars >= 0).length;
  const total = performances.length;
  const profitPct = total > 0 ? (inProfit / total) * 100 : 0;
  const lossPct = 100 - profitPct;

  return (
    <section className="w-full min-w-0">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[#f59e0b]">
        Performance Leaderboard
      </h2>

      <div className="flex w-full min-w-0 flex-col gap-4 md:grid md:grid-cols-2">
        <LeaderboardColumn
          title="Top Performers 🏆"
          rows={topPerformers}
          variant="top"
        />
        <LeaderboardColumn
          title="Needs Attention ⚠️"
          rows={needsAttention}
          variant="bottom"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-300">
            All sets ranked (avg per set)
          </h3>
          <div className="flex rounded-lg border border-zinc-700 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSortMode("percent")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                sortMode === "percent"
                  ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sort by %
            </button>
            <button
              type="button"
              onClick={() => setSortMode("dollars")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                sortMode === "dollars"
                  ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sort by $
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="pb-3 pr-3 font-medium">Rank</th>
                <th className="pb-3 pr-3 font-medium">Set Name</th>
                <th className="pb-3 pr-3 font-medium">Theme</th>
                <th className="pb-3 pr-3 font-medium">Copies</th>
                <th className="pb-3 pr-3 font-medium">Total paid</th>
                <th className="pb-3 pr-3 font-medium">Est. value</th>
                <th className="pb-3 pr-3 font-medium">Gain/Loss $</th>
                <th className="pb-3 font-medium">Gain/Loss %</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => {
                const positive = row.profitDollars >= 0;
                return (
                  <tr
                    key={row.setNumber}
                    className={`border-b border-zinc-800/60 ${
                      index % 2 === 0 ? "bg-zinc-950/40" : "bg-transparent"
                    }`}
                  >
                    <td className="py-3 pr-3 text-zinc-400">{index + 1}</td>
                    <td className="py-3 pr-3 font-medium text-white">
                      {row.name}
                    </td>
                    <td className="py-3 pr-3">
                      <ThemeBadge theme={row.theme} />
                    </td>
                    <td className="py-3 pr-3 text-zinc-400">
                      {row.copyCount > 1 ? (
                        <span className="text-[#f59e0b]">{row.copyCount} copies</span>
                      ) : (
                        conditionLabel(row.representative.condition)
                      )}
                    </td>
                    <td className="py-3 pr-3 text-zinc-300">
                      {formatPrice(row.totalPaid)}
                    </td>
                    <td className="py-3 pr-3 text-[#f59e0b]">
                      {formatPrice(row.totalEstimated)}
                    </td>
                    <td
                      className={`py-3 pr-3 font-medium ${
                        positive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      <span className="block">
                        {formatGainLoss(row.perUnitProfit)} per copy
                      </span>
                      {row.copyCount > 1 && (
                        <span className="text-xs text-zinc-500">
                          {formatGainLoss(row.profitDollars)} total (x
                          {row.copyCount})
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 font-medium ${
                        positive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatPercent(row.percentGain)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-300">
          <span className="font-semibold text-emerald-400">{inProfit}</span> of{" "}
          <span className="font-semibold text-white">{total}</span> sets are in
          profit
        </p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-zinc-800">
          {profitPct > 0 && (
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${profitPct}%` }}
            />
          )}
          {lossPct > 0 && (
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${lossPct}%` }}
            />
          )}
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span className="text-emerald-400">In profit</span>
          <span className="text-red-400">In loss</span>
        </div>
      </div>
    </section>
  );
}

function LeaderboardColumn({
  title,
  rows,
  variant,
}: {
  title: string;
  rows: GroupedSetPerformance[];
  variant: "top" | "bottom";
}) {
  const { formatGainLoss } = useMoneyFormat();
  const isTop = variant === "top";

  return (
    <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No sets yet</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const colorClass = isTop ? "text-emerald-400" : "text-red-400";

            return (
              <li
                key={row.setNumber}
                className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {row.name}
                    {row.copyCount > 1 && (
                      <span className="ml-1.5 text-xs text-[#f59e0b]">
                        ({row.copyCount} copies)
                      </span>
                    )}
                  </p>
                  <div className="mt-1">
                    <ThemeBadge theme={row.theme} />
                  </div>
                  <div className={`mt-2 text-sm font-semibold ${colorClass}`}>
                    {formatPercent(row.percentGain)}
                  </div>
                  <p className={`mt-1 text-xs ${colorClass}`}>
                    {formatGainLoss(row.perUnitProfit)} per copy
                    {row.copyCount > 1 && (
                      <>
                        <span className="text-zinc-600"> · </span>
                        {formatGainLoss(row.profitDollars)} total (x
                        {row.copyCount})
                      </>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function resetSnapshotsAndReload(): PortfolioSnapshot[] {
  resetSnapshots();
  return [];
}

function directionLabel(direction: PortfolioDirection): string {
  switch (direction) {
    case "growing":
      return "Portfolio is Growing ↑";
    case "declining":
      return "Portfolio is Declining ↓";
    default:
      return "Portfolio is Stable →";
  }
}

function PortfolioTrend({
  snapshots,
  onReset,
}: {
  snapshots: PortfolioSnapshot[];
  onReset: () => void;
}) {
  const { formatPrice, formatGainLoss } = useMoneyFormat();

  if (snapshots.length < 2) {
    return (
      <section className="w-full min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[#f59e0b]">
          Portfolio Trend
        </h2>
        <p className="mt-4 text-sm text-zinc-400">
          Come back tomorrow to see your first trend data
        </p>
      </section>
    );
  }

  const first = snapshots[0];
  const latest = snapshots[snapshots.length - 1];
  const trackingDays = daysSince(first.date);
  const healthDelta = latest.healthScore - first.healthScore;
  const valueDelta = latest.totalEstimatedValue - first.totalEstimatedValue;
  const valueDeltaPct =
    first.totalEstimatedValue > 0
      ? Math.round((valueDelta / first.totalEstimatedValue) * 100)
      : 0;
  const direction = getPortfolioDirection(valueDeltaPct);

  const lastSeven = snapshots.slice(-7);
  const maxValue = Math.max(
    ...lastSeven.map((s) => s.totalEstimatedValue),
    1,
  );

  return (
    <section className="w-full min-w-0">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[#f59e0b]">
        Portfolio Trend
      </h2>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-400">
          Tracking since{" "}
          <span className="font-semibold text-white">
            {trackingDays} {trackingDays === 1 ? "day" : "days"} ago
          </span>
        </p>

        <p className="mt-3 text-sm">
          <span className="text-zinc-500">Health score </span>
          {healthDelta > 0 && (
            <span className="font-semibold text-emerald-400">
              ↑ from {first.healthScore} to {latest.healthScore}
            </span>
          )}
          {healthDelta < 0 && (
            <span className="font-semibold text-red-400">
              ↓ from {first.healthScore} to {latest.healthScore}
            </span>
          )}
          {healthDelta === 0 && (
            <span className="font-semibold text-zinc-300">
              → unchanged at {latest.healthScore}
            </span>
          )}
        </p>

        <p className="mt-2 text-sm">
          <span className="text-zinc-500">Total value </span>
          <span
            className={
              valueDelta >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"
            }
          >
            {valueDelta >= 0 ? "+" : ""}
            {formatPrice(valueDelta)} ({valueDeltaPct >= 0 ? "+" : ""}
            {valueDeltaPct}%)
          </span>
          <span className="text-zinc-500"> since first snapshot</span>
        </p>

        <p
          className={`mt-3 text-sm font-semibold ${
            direction === "growing"
              ? "text-emerald-400"
              : direction === "declining"
                ? "text-red-400"
                : "text-zinc-300"
          }`}
        >
          {directionLabel(direction)}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-medium text-zinc-300">Snapshot history</h3>
        <ul className="mt-4 space-y-0">
          {lastSeven.map((snap, index) => {
            const prev = index > 0 ? lastSeven[index - 1] : null;
            const arrow = prev
              ? trendArrow(snap.healthScore, prev.healthScore)
              : null;
            const arrowColor =
              arrow === "↑"
                ? "text-emerald-400"
                : arrow === "↓"
                  ? "text-red-400"
                  : "text-zinc-500";

            return (
              <li key={snap.date}>
                {arrow && (
                  <div
                    className={`flex justify-center py-1 text-xs font-bold ${arrowColor}`}
                    aria-hidden
                  >
                    {arrow}
                  </div>
                )}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">
                      {formatSnapshotDate(snap.date)}
                    </span>
                    <span
                      className={`text-lg font-bold ${healthScoreColorClass(snap.healthScore)}`}
                    >
                      {snap.healthScore}/10
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>
                      Value{" "}
                      <span className="text-[#f59e0b]">
                        {formatPrice(snap.totalEstimatedValue)}
                      </span>
                    </span>
                    <span
                      className={
                        snap.totalProfitLoss >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      P/L {formatGainLoss(snap.totalProfitLoss)}
                    </span>
                    <span>
                      SELL {snap.sellCount} · HOLD {snap.holdCount}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-medium text-zinc-300">
          Estimated value (last {lastSeven.length} snapshots)
        </h3>
        <div className="mt-6 flex items-end justify-between gap-2 sm:gap-3">
          {lastSeven.map((snap, index) => {
            const heightPct =
              (snap.totalEstimatedValue / maxValue) * 100;
            const isLatest = index === lastSeven.length - 1;

            return (
              <div
                key={snap.date}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <div className="flex h-32 w-full items-end justify-center">
                  <div
                    className={`w-full max-w-[2.5rem] rounded-t-md transition-all ${
                      isLatest ? "bg-white" : "bg-[#f59e0b]"
                    }`}
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                    title={formatPrice(snap.totalEstimatedValue)}
                  />
                </div>
                <p className="mt-2 w-full truncate text-center text-xs text-zinc-500">
                  {formatSnapshotDate(snap.date)}
                </p>
                <p className="mt-0.5 w-full truncate text-center text-xs font-medium text-zinc-400">
                  {formatPrice(snap.totalEstimatedValue)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 w-full text-center text-xs text-zinc-600 transition hover:text-zinc-400"
      >
        Reset Trend Data
      </button>
    </section>
  );
}

function ChangesSinceLastVisitBanner({
  changes,
}: {
  changes: RecommendationChange[];
}) {
  return (
    <div className="mb-8 rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#fbbf24]">
        Changes Since Last Visit
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Watch list recommendations updated since your last portfolio visit
      </p>
      <ul className="mt-4 space-y-3">
        {changes.map((change) => (
          <li
            key={change.setNumber}
            className="rounded-xl border border-[#f59e0b]/30 bg-zinc-950/60 px-4 py-3 text-sm"
          >
            <span className="font-semibold text-white">
              #{change.setNumber} {change.name}
            </span>
            <span className="mt-1 block text-[#fbbf24]">
              was {change.old}, now {change.new}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/watchlist"
        className="mt-4 inline-block text-sm text-[#f59e0b] transition hover:text-[#fbbf24] hover:underline"
      >
        View Watch List →
      </Link>
    </div>
  );
}

function PortfolioOpportunityIndexCard({
  items,
}: {
  items: PortfolioItem[];
}) {
  const index = useMemo(() => {
    const scores: ReturnType<typeof scoreOpportunity>[] = [];
    for (const item of items) {
      const analysis = analyzeSet(item.setNumber, item.condition);
      if (!analysis) continue;
      scores.push(
        scoreOpportunity(
          opportunitySetFromLego(
            analysis.set,
            analysis.recommendation,
            analysis.estimatedValue,
          ),
        ),
      );
    }
    if (scores.length === 0) return null;
    const avg = Math.round(
      scores.reduce((s, o) => s + o.opportunityScore, 0) / scores.length,
    );
    const strongBuy = scores.filter(
      (o) => o.buySignal === "Strong Buy" || o.buySignal === "Buy",
    ).length;
    const low = scores.filter((o) => o.opportunityScore < 40).length;
    return { avg, strongBuy, low };
  }, [items]);

  if (!index) return null;

  return (
    <div className="w-full min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Portfolio Opportunity Index
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{index.avg}/100</p>
      <p className="mt-1 text-sm text-zinc-400">Average opportunity score</p>
      {index.strongBuy > 0 && (
        <p className="mt-3 text-sm text-emerald-400">
          {index.strongBuy} set{index.strongBuy === 1 ? "" : "s"} in your
          portfolio have Strong Buy or Buy signals — consider holding
        </p>
      )}
      {index.low > 0 && (
        <p className="mt-2 text-sm text-amber-400">
          {index.low} set{index.low === 1 ? "" : "s"} have low opportunity
          scores — review for potential selling
        </p>
      )}
      <Link
        href="/opportunities"
        className="mt-4 inline-block text-sm font-semibold text-[#f59e0b] hover:underline"
      >
        Browse market opportunities →
      </Link>
    </div>
  );
}

function GrowthStatCard() {
  const { formatPrice } = useMoneyFormat();
  const growth = getPortfolioGrowthPercent();

  if (!growth) {
    return (
      <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Collection growth
        </p>
        <p className="mt-4 text-sm text-zinc-400">
          Add sets to start tracking portfolio growth over time.
        </p>
        <Link
          href="/growth"
          className="mt-4 inline-block text-sm font-semibold text-[#f59e0b] hover:underline"
        >
          View Full Growth History →
        </Link>
      </div>
    );
  }

  const positive = growth.percent >= 0;

  return (
    <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Collection growth
      </p>
      <p
        className={`mt-4 text-lg font-bold ${
          positive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        Portfolio {positive ? "up" : "down"} {Math.abs(growth.percent)}% since
        tracking began
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        {positive ? "+" : ""}
        {formatPrice(growth.dollars)} total value change
      </p>
      <Link
        href="/growth"
        className="mt-4 inline-block text-sm font-semibold text-[#f59e0b] hover:underline"
      >
        View Full Growth History →
      </Link>
    </div>
  );
}

function HealthScoreCard({
  metrics,
}: {
  metrics: NonNullable<ReturnType<typeof computePortfolioMetrics>>;
}) {
  const styles = healthStyles(metrics.healthLabel);

  return (
    <div
      className={`w-full min-w-0 overflow-visible rounded-2xl border p-6 ${styles.border} ${styles.bg}`}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Portfolio health score
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold ${styles.score}`}>
            {metrics.healthScore}
          </span>
          <span className="text-2xl text-zinc-600">/10</span>
        </div>
        <span
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${styles.badge}`}
        >
          {metrics.healthLabel}
        </span>
      </div>
      <p className="mt-4 text-sm text-zinc-400">
        {metrics.uniqueSetCount} unique sets · {metrics.totalCopyCount} total
        copies
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Avg copies per set: {metrics.avgCopiesPerSet} · {metrics.sellCount}{" "}
        sell · {metrics.holdCount} hold · {metrics.percentGain >= 0 ? "+" : ""}
        {metrics.percentGain}% overall
      </p>
      {metrics.mostHeldSet && metrics.mostHeldSet.quantity > 1 && (
        <p className="mt-2 text-sm text-[#fbbf24]">
          Most held: {metrics.mostHeldSet.name} ({metrics.mostHeldSet.quantity}{" "}
          copies)
        </p>
      )}
    </div>
  );
}

function DataFreshnessSummaryCard({
  counts,
}: {
  counts: { Fresh: number; Recent: number; Aging: number; Outdated: number };
}) {
  const rows = [
    { label: "Fresh", count: counts.Fresh, color: "text-emerald-400" },
    { label: "Recent", count: counts.Recent, color: "text-[#f59e0b]" },
    { label: "Aging", count: counts.Aging, color: "text-orange-400" },
    { label: "Outdated", count: counts.Outdated, color: "text-red-400" },
  ] as const;

  return (
    <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-[#f59e0b]">Data Freshness</h3>
      <ul className="mt-4 flex flex-col gap-2 md:grid md:grid-cols-2">
        {rows.map(({ label, count, color }) => (
          <li
            key={label}
            className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 text-sm"
          >
            <span className={color}>{label}</span>
            <span className="font-semibold text-white">
              {count} {count === 1 ? "set" : "sets"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PortfolioConfidenceCard({
  summary,
}: {
  summary: {
    average: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  } | null;
}) {
  if (!summary) return null;
  const styling = getConfidenceStyling(summary.average);
  const highPct = (summary.high / summary.total) * 100;
  const mediumPct = (summary.medium / summary.total) * 100;
  const lowPct = (summary.low / summary.total) * 100;

  return (
    <div
      className={`w-full min-w-0 overflow-visible rounded-2xl border p-5 ${styling.borderColor} ${styling.bgColor}`}
    >
      <h3 className="text-sm font-medium text-[#f59e0b]">
        Portfolio Confidence Summary
      </h3>
      <p className={`mt-3 text-3xl font-bold ${styling.color}`}>
        {summary.average}
        <span className="text-lg text-zinc-600">/100 avg</span>
      </p>
      <p className={`mt-1 text-xs font-medium ${styling.color}`}>
        {styling.label}
      </p>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-800">
        {highPct > 0 && (
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${highPct}%` }}
            title="High confidence"
          />
        )}
        {mediumPct > 0 && (
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${mediumPct}%` }}
            title="Medium confidence"
          />
        )}
        {lowPct > 0 && (
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${lowPct}%` }}
            title="Low confidence"
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className="text-emerald-400">High {summary.high}</span>
        <span className="text-amber-400">Medium {summary.medium}</span>
        <span className="text-red-400">Low {summary.low}</span>
      </div>

      <p className="mt-4 text-sm text-zinc-300">
        <span className="font-semibold text-emerald-400">{summary.high}</span>{" "}
        {summary.high === 1 ? "set has" : "sets have"} High Confidence
        recommendations
      </p>

      {summary.average < 50 && (
        <p
          className="mt-3 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-sm text-[#fbbf24]"
          role="alert"
        >
          ⚠️ Low average confidence — consider reviewing your portfolio
        </p>
      )}
    </div>
  );
}

function ConcentrationDashboard({
  warnings,
}: {
  warnings: NonNullable<
    ReturnType<typeof computePortfolioMetrics>
  >["concentrationWarnings"];
}) {
  return (
    <div className="w-full min-w-0 rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] p-5">
      <h3 className="text-sm font-bold text-[#fbbf24]">Portfolio concentration</h3>
      <ul className="mt-4 space-y-2">
        {warnings.map((w) => (
          <li
            key={w.setNumber}
            className="rounded-lg border border-[#f59e0b]/20 bg-zinc-950/50 px-3 py-2 text-sm text-[#fbbf24]"
          >
            ⚠️ High Concentration — {w.name} represents {w.percent}% of your
            portfolio value
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValueCard({
  metrics,
}: {
  metrics: NonNullable<ReturnType<typeof computePortfolioMetrics>>;
}) {
  const { formatPrice, formatDualLine } = useMoneyFormat();

  return (
    <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-[#f59e0b]">Value overview</h3>
      <p className="mt-1 text-xs text-zinc-500">
        {metrics.uniqueSetCount} unique sets · {metrics.totalCopyCount} copies ·
        totals include all copies
      </p>
      <p className="mt-2 text-sm font-medium text-white">
        Total value: {formatDualLine(metrics.totalEstimated)}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
        <MiniStat label="Total paid" value={formatPrice(metrics.totalPaid)} />
        <MiniStat
          label="Est. value"
          value={formatDualLine(metrics.totalEstimated)}
          highlight
        />
        <MiniStat
          label="Profit / loss"
          value={formatPrice(metrics.totalProfit)}
          valueClass={
            metrics.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
          }
        />
        <MiniStat
          label="Gain / loss"
          value={`${metrics.percentGain >= 0 ? "+" : ""}${metrics.percentGain}%`}
          valueClass={
            metrics.percentGain >= 0 ? "text-emerald-400" : "text-red-400"
          }
        />
      </div>
    </div>
  );
}

function SellHoldBarCard({
  metrics,
}: {
  metrics: NonNullable<ReturnType<typeof computePortfolioMetrics>>;
}) {
  const total = metrics.sellCount + metrics.holdCount;
  const sellPct = total > 0 ? (metrics.sellCount / total) * 100 : 0;
  const holdPct = total > 0 ? (metrics.holdCount / total) * 100 : 0;

  return (
    <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-[#f59e0b]">SELL vs HOLD</h3>
      <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-zinc-800">
        {sellPct > 0 && (
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${sellPct}%` }}
            title={`SELL ${metrics.sellCount}`}
          />
        )}
        {holdPct > 0 && (
          <div
            className="bg-[#f59e0b] transition-all"
            style={{ width: `${holdPct}%` }}
            title={`HOLD ${metrics.holdCount}`}
          />
        )}
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-emerald-400">
          SELL <span className="font-semibold text-white">{metrics.sellCount}</span>
        </span>
        <span className="text-[#f59e0b]">
          HOLD <span className="font-semibold text-white">{metrics.holdCount}</span>
        </span>
      </div>
    </div>
  );
}

function ThemeBreakdownCard({
  metrics,
}: {
  metrics: NonNullable<ReturnType<typeof computePortfolioMetrics>>;
}) {
  return (
    <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-[#f59e0b]">By theme</h3>
      <ul className="mt-4 space-y-3">
        {metrics.themeBreakdown.map(({ theme, count }) => {
          const themeTotal = metrics.themeBreakdown.reduce(
            (sum, row) => sum + row.count,
            0,
          );
          const pct =
            themeTotal > 0 ? Math.round((count / themeTotal) * 100) : 0;
          return (
            <li key={theme}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-zinc-300">{theme}</span>
                <span className="shrink-0 font-medium text-white">
                  {count} {count === 1 ? "set" : "sets"}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#f59e0b] transition-all"
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PerformanceCard({
  metrics,
}: {
  metrics: NonNullable<ReturnType<typeof computePortfolioMetrics>>;
}) {
  return (
    <div className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-[#f59e0b]">Performance</h3>
      <div className="mt-4 flex flex-col gap-4 md:grid md:grid-cols-2">
        {metrics.bestPerforming && (
          <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4">
            <p className="text-xs font-medium uppercase text-emerald-500">
              Best performer
            </p>
            <p className="mt-2 font-semibold text-white">
              #{metrics.bestPerforming.item.setNumber}{" "}
              {metrics.bestPerforming.item.name}
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-400">
              +{metrics.bestPerforming.percentGain}%
            </p>
          </div>
        )}
        {metrics.worstPerforming && (
          <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4">
            <p className="text-xs font-medium uppercase text-red-400">
              Worst performer
            </p>
            <p className="mt-2 font-semibold text-white">
              #{metrics.worstPerforming.item.setNumber}{" "}
              {metrics.worstPerforming.item.name}
            </p>
            <p
              className={`mt-1 text-lg font-bold ${
                metrics.worstPerforming.percentGain >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {metrics.worstPerforming.percentGain >= 0 ? "+" : ""}
              {metrics.worstPerforming.percentGain}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-base font-bold ${highlight ? "text-[#f59e0b]" : valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
