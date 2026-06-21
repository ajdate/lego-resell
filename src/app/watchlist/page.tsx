"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppHeader } from "@/components/AppHeader";
import { AuthSignInPrompt } from "@/components/AuthSignInPrompt";
import {
  WatchlistSetCard,
  type WatchlistCardData,
} from "@/components/WatchlistSetCard";
import {
  analyzeSet,
  findSet,
  isSetRetired,
  isSetRetiringSoon,
} from "@/lib/analyze";
import {
  calculateConfidence,
  setDataFromLegoSet,
} from "@/lib/confidence";
import {
  addToPortfolio,
  getCopyCountForSet,
  loadPortfolio,
} from "@/lib/portfolio";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { formatWatchlistExport } from "@/lib/watchlist-export";
import {
  getConfidenceChangeMessage,
  loadWatchlistConfidenceScores,
  storeWatchlistConfidence,
} from "@/lib/watchlist-confidence";
import {
  loadWatchlistMeta,
  updateWatchlistMeta,
  type WatchlistMetaMap,
} from "@/lib/watchlist-meta";
import {
  loadWatchlist,
  removeFromWatchlist,
  saveWatchlist,
  type RecommendationMap,
  type WatchlistItem,
} from "@/lib/watchlist";

function watchlistItemFromSupabaseRow(
  row: Record<string, unknown>,
): WatchlistItem | null {
  try {
    if (typeof row.notes === "string" && row.notes) {
      return JSON.parse(row.notes) as WatchlistItem;
    }
    if (typeof row.set_name === "string" && row.set_name.startsWith("__bv1:")) {
      return JSON.parse(row.set_name.slice("__bv1:".length)) as WatchlistItem;
    }
    if (row.set_number) {
      return {
        setNumber: String(row.set_number),
        name: String(row.set_name ?? ""),
        theme: "",
        recommendation: "HOLD",
        recommendationAtAdd: "HOLD",
        estimatedValue: Number(row.target_price ?? 0),
        dateAdded: String(row.created_at ?? new Date().toISOString()),
      };
    }
  } catch {
    return null;
  }
  return null;
}

function syncWatchlistItemToSupabase(
  userId: string | undefined,
  item: WatchlistItem,
) {
  if (!userId) return;

  fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  })
    .then((r) => r.json())
    .then((result) => {
      console.log("Watchlist Supabase save:", result);
    })
    .catch((err) => {
      console.error("Watchlist Supabase save error:", err);
    });
}

function deleteWatchlistItemFromSupabase(
  userId: string | undefined,
  setNumber: string,
) {
  if (!userId) return;

  fetch("/api/watchlist", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ set_number: setNumber }),
  }).catch((err) => {
    console.error("Watchlist Supabase delete error:", err);
  });
}

type ViewMode = "grid" | "list";
type SummaryFilter =
  | "all"
  | "recChanged"
  | "retiringSoon"
  | "retired"
  | null;
type ListFilter =
  | "all"
  | "retiringSoon"
  | "retired"
  | "recChanged"
  | "sell"
  | "hold";
type SortKey =
  | "dateAdded"
  | "setNumber"
  | "estimatedValue"
  | "confidenceScore";

export default function WatchlistPage() {
  const { user } = useUser();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [metaMap, setMetaMap] = useState<WatchlistMetaMap>({});
  const [portfolioCounts, setPortfolioCounts] = useState<Record<string, number>>(
    {},
  );
  const [currentRecs, setCurrentRecs] = useState<RecommendationMap>({});
  const [loaded, setLoaded] = useState(false);
  const [recsLoading, setRecsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>(null);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [sort, setSort] = useState<SortKey>("dateAdded");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportFeedback, setExportFeedback] = useState("");

  const refreshPortfolioCounts = useCallback(() => {
    const portfolio = loadPortfolio();
    const counts: Record<string, number> = {};
    for (const item of portfolio) {
      counts[item.setNumber] = item.quantity;
    }
    setPortfolioCounts(counts);
  }, []);

  const fetchCurrentRecommendations = useCallback(async () => {
    setRecsLoading(true);
    try {
      const res = await fetch("/api/watchlist-check");
      const data = await res.json();
      if (res.ok && data.recommendations) {
        setCurrentRecs(data.recommendations as RecommendationMap);
      }
    } catch {
      setCurrentRecs({});
    } finally {
      setRecsLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems(loadWatchlist());
    setMetaMap(loadWatchlistMeta());
    refreshPortfolioCounts();
    setLoaded(true);
    fetchCurrentRecommendations();
  }, [fetchCurrentRecommendations, refreshPortfolioCounts]);

  useEffect(() => {
    if (!user?.id) return;

    void (async () => {
      try {
        const localWatchlist = loadWatchlist();
        const response = await fetch("/api/watchlist");
        const { data, error } = await response.json();
        if (error) console.error("Watchlist load error:", error);

        const apiRows = Array.isArray(data) ? data : [];
        const apiSetNumbers = new Set(
          apiRows.map((row: { set_number?: string }) => row.set_number),
        );

        for (const item of localWatchlist) {
          if (!apiSetNumbers.has(item.setNumber)) {
            syncWatchlistItemToSupabase(user.id, item);
          }
        }

        if (apiRows.length > 0) {
          console.log("Loaded watchlist from Supabase:", apiRows.length);
          const parsed = apiRows
            .map((row: Record<string, unknown>) =>
              watchlistItemFromSupabaseRow(row),
            )
            .filter((item: WatchlistItem | null): item is WatchlistItem =>
              item !== null,
            );
          const mergedBySet = new Map(
            parsed.map((item) => [item.setNumber, item]),
          );
          for (const item of localWatchlist) {
            mergedBySet.set(item.setNumber, item);
          }
          const merged = [...mergedBySet.values()];
          if (merged.length > 0) {
            setItems(merged);
          }
        } else if (localWatchlist.length > 0) {
          for (const item of localWatchlist) {
            syncWatchlistItemToSupabase(user.id, item);
          }
        }
      } catch (loadError) {
        console.error("Watchlist load error:", loadError);
      }
    })();
  }, [user?.id]);

  const enriched = useMemo((): WatchlistCardData[] => {
    const storedScores = loadWatchlistConfidenceScores();
    return items.map((item) => {
      const current = currentRecs[item.setNumber] ?? item.recommendation;
      const changedSinceAdd = current !== item.recommendationAtAdd;
      const analysis = analyzeSet(item.setNumber, "sealed");
      const catalogueSet = findSet(item.setNumber);
      const estimatedValueUsd =
        analysis?.estimatedValue ?? item.estimatedValue;
      const confidence = analysis
        ? calculateConfidence(
            setDataFromLegoSet(
              analysis.set,
              analysis.recommendation,
              analysis.estimatedValue,
            ),
            "sealed",
          )
        : null;
      const confidenceChange = confidence
        ? getConfidenceChangeMessage(
            storedScores[item.setNumber],
            confidence.score,
            confidence.label,
          )
        : null;
      return {
        item,
        current,
        changedSinceAdd,
        confidence,
        confidenceChange,
        analysis,
        catalogueSet,
        estimatedValueUsd,
        meta: metaMap[item.setNumber] ?? {},
        portfolioCopyCount: portfolioCounts[item.setNumber] ?? 0,
      };
    });
  }, [items, currentRecs, metaMap, portfolioCounts]);

  useEffect(() => {
    if (!loaded || items.length === 0) return;
    for (const row of enriched) {
      if (row.confidence) {
        storeWatchlistConfidence(
          row.item.setNumber,
          row.confidence.score,
          row.confidence.label,
        );
      }
    }
  }, [loaded, items.length, enriched]);

  const stats = useMemo(() => {
    let recChanged = 0;
    let retiringSoon = 0;
    let retired = 0;
    for (const row of enriched) {
      if (row.changedSinceAdd) recChanged += 1;
      if (isSetRetiringSoon(row.catalogueSet)) retiringSoon += 1;
      if (isSetRetired(row.catalogueSet)) retired += 1;
    }
    return {
      total: enriched.length,
      recChanged,
      retiringSoon,
      retired,
    };
  }, [enriched]);

  const activeFilter: ListFilter = useMemo(() => {
    if (summaryFilter === "recChanged") return "recChanged";
    if (summaryFilter === "retiringSoon") return "retiringSoon";
    if (summaryFilter === "retired") return "retired";
    return listFilter;
  }, [summaryFilter, listFilter]);

  const filtered = useMemo(() => {
    let list = [...enriched];
    switch (activeFilter) {
      case "retiringSoon":
        list = list.filter((r) => isSetRetiringSoon(r.catalogueSet));
        break;
      case "retired":
        list = list.filter((r) => isSetRetired(r.catalogueSet));
        break;
      case "recChanged":
        list = list.filter((r) => r.changedSinceAdd);
        break;
      case "sell":
        list = list.filter((r) => r.current === "SELL");
        break;
      case "hold":
        list = list.filter((r) => r.current === "HOLD");
        break;
    }
    list.sort((a, b) => {
      switch (sort) {
        case "setNumber":
          return a.item.setNumber.localeCompare(b.item.setNumber);
        case "estimatedValue":
          return b.estimatedValueUsd - a.estimatedValueUsd;
        case "confidenceScore":
          return (b.confidence?.score ?? 0) - (a.confidence?.score ?? 0);
        default:
          return (
            new Date(b.item.dateAdded).getTime() -
            new Date(a.item.dateAdded).getTime()
          );
      }
    });
    return list;
  }, [enriched, activeFilter, sort]);

  function handleRemove(setNumber: string) {
    setItems(removeFromWatchlist(setNumber));
    deleteWatchlistItemFromSupabase(user?.id, setNumber);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(setNumber);
      return next;
    });
  }

  function handleMetaChange(setNumber: string, patch: Parameters<typeof updateWatchlistMeta>[1]) {
    setMetaMap(updateWatchlistMeta(setNumber, patch));
  }

  function toggleSelect(setNumber: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(setNumber);
      else next.delete(setNumber);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(filtered.map((r) => r.item.setNumber)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function bulkRemove() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Remove ${selected.size} set${selected.size === 1 ? "" : "s"} from your watch list?`,
      )
    ) {
      return;
    }
    let next = loadWatchlist();
    for (const num of selected) {
      next = next.filter((i) => i.setNumber !== num);
    }
    saveWatchlist(next);
    setItems(next);
    for (const num of selected) {
      deleteWatchlistItemFromSupabase(user?.id, num);
    }
    clearSelection();
  }

  function bulkAddPortfolio() {
    const rows = enriched.filter((r) => selected.has(r.item.setNumber));
    if (rows.length === 0) return;
    if (
      !window.confirm(
        `Add ${rows.length} set${rows.length === 1 ? "" : "s"} to portfolio at sealed condition? Purchase price will be set to current estimated value (AUD) for each.`,
      )
    ) {
      return;
    }
    for (const row of rows) {
      if (!row.analysis) continue;
      addToPortfolio({
        setNumber: row.item.setNumber,
        name: row.item.name,
        theme: row.item.theme,
        condition: "sealed",
        purchasePrice: row.analysis.estimatedValue,
        estimatedValue: row.analysis.estimatedValue,
        suggestedListPrice: row.analysis.recommendedListPrice,
        recommendation: row.analysis.recommendation,
        quantity: 1,
      });
    }
    refreshPortfolioCounts();
    clearSelection();
  }

  function exportRows(rows: WatchlistCardData[]) {
    const text = formatWatchlistExport(
      rows.map((r) => ({
        item: r.item,
        currentRecommendation: r.current,
        estimatedValueAud: r.estimatedValueUsd,
        retired: isSetRetired(r.catalogueSet),
        retiringSoon: isSetRetiringSoon(r.catalogueSet),
      })),
    );
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setExportFeedback("Copied to clipboard");
        setTimeout(() => setExportFeedback(""), 2000);
      })
      .catch(() => {
        setExportFeedback("Copy failed");
        setTimeout(() => setExportFeedback(""), 2000);
      });
  }

  function handleSummaryClick(key: SummaryFilter) {
    setSummaryFilter((prev) => (prev === key ? null : key));
    setListFilter("all");
  }

  const filterButtons: { key: ListFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "retiringSoon", label: "Retiring Soon" },
    { key: "retired", label: "Retired" },
    { key: "recChanged", label: "Recommendation Changed" },
    { key: "sell", label: "SELL" },
    { key: "hold", label: "HOLD" },
  ];

  return (
    <AuthSignInPrompt
      emoji="👀"
      title="Watch your sets"
      description="Your watchlist syncs across all your devices"
    >
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader title="Watch List" subtitle="Monitor sets and price targets" />

      <main className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Watch List</h1>
              {loaded && (
                <span className="rounded-full bg-[#f59e0b]/20 px-3 py-0.5 text-sm font-bold text-[#f59e0b]">
                  {items.length} {items.length === 1 ? "set" : "sets"}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Monitor sets for retirement, price changes and buying opportunities
            </p>
          </div>
          <div className="flex rounded-lg border border-zinc-700 p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === "grid"
                  ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Grid View
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === "list"
                  ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {loaded && items.length > 0 && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat
                label="Total watched"
                value={stats.total}
                active={activeFilter === "all"}
                onClick={() => {
                  setSummaryFilter(null);
                  setListFilter("all");
                }}
              />
              <SummaryStat
                label="Rec. changed"
                value={stats.recChanged}
                active={summaryFilter === "recChanged"}
                onClick={() => handleSummaryClick("recChanged")}
                highlight={stats.recChanged > 0}
              />
              <SummaryStat
                label="Retiring soon"
                value={stats.retiringSoon}
                active={summaryFilter === "retiringSoon"}
                onClick={() => handleSummaryClick("retiringSoon")}
                highlight={stats.retiringSoon > 0}
              />
              <SummaryStat
                label="Retired"
                value={stats.retired}
                active={summaryFilter === "retired"}
                onClick={() => handleSummaryClick("retired")}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="filter-scroll flex flex-1 gap-2 pb-1 sm:flex-wrap sm:pb-0">
                {filterButtons.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setListFilter(key);
                      setSummaryFilter(null);
                    }}
                    className={`filter-chip shrink-0 rounded-lg px-3 text-xs font-medium transition ${
                      activeFilter === key
                        ? "bg-[#f59e0b]/20 text-[#f59e0b] ring-1 ring-[#f59e0b]/40"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <CurrencyToggle className="shrink-0 self-start sm:self-center" />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <label htmlFor="watchlist-sort" className="sr-only">
                  Sort
                </label>
                <select
                  id="watchlist-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-white focus:border-[#f59e0b] focus:outline-none sm:w-auto sm:py-2 sm:text-sm"
                >
                  <option value="dateAdded">Date Added</option>
                  <option value="setNumber">Set Number</option>
                  <option value="estimatedValue">Estimated Value</option>
                  <option value="confidenceScore">Confidence Score</option>
                </select>
                <button
                  type="button"
                  onClick={() => exportRows(filtered)}
                  className="filter-chip rounded-lg border border-zinc-600 px-3 text-xs font-medium text-zinc-300 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
                >
                  Export Watch List
                </button>
                {exportFeedback && (
                  <span className="text-xs text-emerald-400">{exportFeedback}</span>
                )}
              </div>
            </div>

            {recsLoading && (
              <p className="mt-4 text-sm text-zinc-500">
                Refreshing recommendations…
              </p>
            )}

            {selected.size > 0 && (
              <div className="sticky top-2 z-10 mt-4 flex flex-col gap-3 rounded-xl border border-[#f59e0b]/40 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
                <span className="text-sm font-medium text-[#fbbf24]">
                  {selected.size} selected
                </span>
                <button
                  type="button"
                  onClick={bulkRemove}
                  className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40"
                >
                  Remove Selected
                </button>
                <button
                  type="button"
                  onClick={bulkAddPortfolio}
                  className="rounded-lg border border-[#f59e0b]/40 px-3 py-1.5 text-xs font-medium text-[#f59e0b] hover:bg-[#f59e0b]/10"
                >
                  Add All to Portfolio
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportRows(
                      enriched.filter((r) => selected.has(r.item.setNumber)),
                    )
                  }
                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white"
                >
                  Export Selected
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="ml-auto text-xs text-zinc-500 hover:text-[#f59e0b]"
                >
                  Select all visible
                </button>
              </div>
            )}

            <div
              className={`mt-6 ${
                view === "grid"
                  ? "grid grid-cols-1 gap-4 md:grid-cols-2"
                  : "flex flex-col gap-4"
              }`}
            >
              {filtered.map((row) => (
                <WatchlistSetCard
                  key={row.item.setNumber}
                  data={row}
                  view={view}
                  selected={selected.has(row.item.setNumber)}
                  onSelect={(checked) =>
                    toggleSelect(row.item.setNumber, checked)
                  }
                  onRemove={() => handleRemove(row.item.setNumber)}
                  onMetaChange={(patch) =>
                    handleMetaChange(row.item.setNumber, patch)
                  }
                  onPortfolioAdded={refreshPortfolioCounts}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="mt-12 text-center text-zinc-500">
                No sets match this filter.
              </p>
            )}
          </>
        )}

        {loaded && items.length === 0 && <WatchlistEmptyState />}

        {!loaded && (
          <p className="py-24 text-center text-zinc-500">Loading watch list…</p>
        )}
      </main>
    </div>
    </AuthSignInPrompt>
  );
}

function SummaryStat({
  label,
  value,
  active,
  onClick,
  highlight,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-[#f59e0b]/50 bg-[#f59e0b]/10"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight && value > 0 ? "text-[#f59e0b]" : "text-white"
        }`}
      >
        {value}
      </p>
    </button>
  );
}

function WatchlistEmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-20 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center" aria-hidden>
        <span className="absolute h-16 w-16 rounded-full border-2 border-[#f59e0b]/30" />
        <span className="absolute h-10 w-10 rotate-45 border-2 border-zinc-600" />
        <span className="text-3xl text-zinc-600">◎</span>
      </div>
      <h2 className="mt-6 text-xl font-semibold text-white">
        Your watch list is empty
      </h2>
      <p className="mt-2 max-w-sm text-zinc-400">
        Search for sets and click Watch to start monitoring
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-[#f59e0b] px-6 py-3 font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
      >
        Search sets
      </Link>
    </div>
  );
}
