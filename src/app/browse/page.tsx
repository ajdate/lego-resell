"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { SetImage } from "@/components/SetImage";
import { ScarcityDemandBadges } from "@/components/RatingBadges";
import { ConfidenceCompactBadge } from "@/components/ConfidenceDisplay";
import {
  calculateConfidence,
  getConfidenceBand,
  setDataFromLegoSet,
} from "@/lib/confidence";
import {
  explanationSetFromLegoSet,
  getDemandRating,
  getScarcityRating,
} from "@/lib/explanations";
import { BROWSE_CATEGORIES, type SetSearchResult } from "@/lib/search";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { useCurrency } from "@/src/lib/currencyContext";

type FilterKey = "all" | "retired" | "retiringSoon" | "sell" | "hold";
type ConfidenceFilterKey = "all" | "high" | "low";
type ExplanationFilterKey = "all" | "highDemand" | "veryRare";
type SortKey = "valueDesc" | "valueAsc" | "yearDesc" | "yearAsc";

function BrowseContent() {
  const { formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const themeParam = searchParams.get("theme") ?? "";

  const [sets, setSets] = useState<SetSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilterKey>("all");
  const [explanationFilter, setExplanationFilter] =
    useState<ExplanationFilterKey>("all");
  const [sort, setSort] = useState<SortKey>("valueDesc");

  const categoryLabel =
    BROWSE_CATEGORIES.find((c) => c.theme === themeParam)?.label ?? themeParam;

  useEffect(() => {
    if (!themeParam) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?theme=${encodeURIComponent(themeParam)}`)
      .then((res) => res.json())
      .then((data: { results?: SetSearchResult[] }) => {
        setSets(data.results ?? []);
      })
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, [themeParam]);

  const filtered = useMemo(() => {
    let list = [...sets];
    switch (filter) {
      case "retired":
        list = list.filter((s) => s.retired);
        break;
      case "retiringSoon":
        list = list.filter((s) => s.retiringSoon);
        break;
      case "sell":
        list = list.filter((s) => s.recommendation === "SELL");
        break;
      case "hold":
        list = list.filter((s) => s.recommendation === "HOLD");
        break;
    }
    if (confidenceFilter !== "all") {
      list = list.filter((s) => {
        const score = calculateConfidence(
          setDataFromLegoSet(
            {
              theme: s.theme,
              pieces: s.pieces,
              retired: s.retired,
              retiringSoon: s.retiringSoon,
            },
            s.recommendation,
            s.estimatedValue,
          ),
          "sealed",
        ).score;
        const band = getConfidenceBand(score);
        return confidenceFilter === "high" ? band === "high" : band === "low";
      });
    }
    if (explanationFilter === "highDemand") {
      list = list.filter((s) => {
        const setData = explanationSetFromLegoSet(
          {
            theme: s.theme,
            pieces: s.pieces,
            year: s.year,
            retired: s.retired,
            retiringSoon: s.retiringSoon,
          },
          s.recommendation,
          s.estimatedValue,
        );
        const demand = getDemandRating(setData, "sealed");
        return demand === "Very High" || demand === "High";
      });
    }
    if (explanationFilter === "veryRare") {
      list = list.filter((s) => {
        const setData = explanationSetFromLegoSet(
          {
            theme: s.theme,
            pieces: s.pieces,
            year: s.year,
            retired: s.retired,
            retiringSoon: s.retiringSoon,
          },
          s.recommendation,
          s.estimatedValue,
        );
        return getScarcityRating(setData) === "Very Rare";
      });
    }
    switch (sort) {
      case "valueAsc":
        list.sort((a, b) => a.estimatedValue - b.estimatedValue);
        break;
      case "yearDesc":
        list.sort((a, b) => b.year - a.year);
        break;
      case "yearAsc":
        list.sort((a, b) => a.year - b.year);
        break;
      default:
        list.sort((a, b) => b.estimatedValue - a.estimatedValue);
    }
    return list;
  }, [sets, filter, confidenceFilter, explanationFilter, sort]);

  function goToSet(setNumber: string) {
    router.push(
      `/results?set=${encodeURIComponent(setNumber)}&condition=sealed&from=browse&theme=${encodeURIComponent(themeParam)}`,
    );
  }

  if (!themeParam) {
    return (
      <div className="page-main mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-zinc-400">Choose a category from the search page.</p>
        <Link
          href="/"
          className="touch-target mt-4 inline-flex items-center justify-center text-[#f59e0b] hover:underline"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="page-main mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-5xl">
      <Link
        href="/"
        className="text-sm text-zinc-500 transition hover:text-[#f2cd00]"
      >
        ← Search
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-white">{categoryLabel}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {loading ? "Loading…" : `${filtered.length} sets`}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="filter-scroll flex flex-1 gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {(
          [
            ["all", "All"],
            ["retired", "Retired Only"],
            ["retiringSoon", "Retiring Soon"],
            ["sell", "SELL"],
            ["hold", "HOLD"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`filter-chip shrink-0 rounded-lg px-3 text-xs font-medium transition ${
              filter === key
                ? "bg-[#f59e0b]/20 text-[#f59e0b] ring-1 ring-[#f59e0b]/40"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        </div>
        <CurrencyToggle className="shrink-0 self-start sm:self-center" />
      </div>

      <div className="filter-scroll mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {(
          [
            ["all", "All Confidence"],
            ["high", "High Confidence Only"],
            ["low", "Low Confidence"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setConfidenceFilter(key)}
            className={`filter-chip shrink-0 rounded-lg px-3 text-xs font-medium transition ${
              confidenceFilter === key
                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-scroll mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {(
          [
            ["all", "All Sets"],
            ["highDemand", "High Demand Only"],
            ["veryRare", "Very Rare Only"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setExplanationFilter(key)}
            className={`filter-chip shrink-0 rounded-lg px-3 text-xs font-medium transition ${
              explanationFilter === key
                ? "bg-[#f59e0b]/20 text-[#f59e0b] ring-1 ring-[#f59e0b]/40"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 w-full">
        <label htmlFor="sort" className="sr-only">
          Sort
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-white focus:border-[#f59e0b] focus:outline-none md:w-auto md:py-2 md:text-sm"
        >
          <option value="valueDesc">Value High–Low</option>
          <option value="valueAsc">Value Low–High</option>
          <option value="yearDesc">Newest</option>
          <option value="yearAsc">Oldest</option>
        </select>
      </div>

      {loading && (
        <p className="mt-12 text-center text-zinc-500">Loading sets…</p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="mt-12 text-center text-zinc-500">No sets match this filter.</p>
      )}

      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const isSell = s.recommendation === "SELL";
          const confidence = calculateConfidence(
            setDataFromLegoSet(
              {
                theme: s.theme,
                pieces: s.pieces,
                retired: s.retired,
                retiringSoon: s.retiringSoon,
              },
              s.recommendation,
              s.estimatedValue,
            ),
            "sealed",
          );
          return (
            <li key={s.number}>
              <button
                type="button"
                onClick={() => goToSet(s.number)}
                className="touch-target w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition hover:border-[#f59e0b]/40"
              >
                <SetImage
                  setNumber={s.number}
                  setName={s.name}
                  variant="card"
                  showSetNumberOnFallback={false}
                />
                <p className="font-mono text-sm font-bold text-[#f59e0b]">
                  {s.number}
                </p>
                <p className="mt-1 font-semibold text-white">{s.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {s.pieces.toLocaleString()} pieces · {s.year}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.retired && (
                    <span className="rounded-md bg-red-950/80 px-2 py-0.5 text-xs font-semibold text-red-400">
                      RETIRED
                    </span>
                  )}
                  {s.retiringSoon && (
                    <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-xs font-semibold text-[#f59e0b]">
                      RETIRING SOON
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <ScarcityDemandBadges
                    set={explanationSetFromLegoSet(
                      {
                        theme: s.theme,
                        pieces: s.pieces,
                        year: s.year,
                        retired: s.retired,
                        retiringSoon: s.retiringSoon,
                      },
                      s.recommendation,
                      s.estimatedValue,
                    )}
                    condition="sealed"
                    confidenceScore={confidence.score}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#f59e0b]">
                    {formatPrice(s.estimatedValue)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ConfidenceCompactBadge result={confidence} />
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        isSell
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {s.recommendation}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader title="Browse" subtitle="Explore by category" />
      <Suspense
        fallback={
          <p className="py-24 text-center text-zinc-500">Loading…</p>
        }
      >
        <BrowseContent />
      </Suspense>
    </div>
  );
}
