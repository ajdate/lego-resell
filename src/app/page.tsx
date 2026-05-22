"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  SetSearchInput,
  submitSearchFromQuery,
} from "@/components/SetSearchInput";
import type { Condition } from "@/lib/analyze";
import { getAllMarketOpportunities } from "@/lib/market-opportunities";
import { buySignalClassName } from "@/lib/opportunityScoring";
import {
  getAllRetiringSoonEntries,
  RETIRING_TIER_CONFIG,
} from "@/lib/retiring-soon";
import { BROWSE_CATEGORIES } from "@/lib/search";
interface SetOption {
  number: string;
  name: string;
  retired?: boolean;
  retiringSoon?: boolean;
}

const CONDITIONS: { value: Condition; label: string; hint: string }[] = [
  { value: "sealed", label: "Sealed", hint: "Factory sealed box" },
  { value: "complete", label: "Complete", hint: "Built, all parts & instructions" },
  { value: "incomplete", label: "Incomplete", hint: "Missing pieces or box" },
];

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [condition, setCondition] = useState<Condition>("sealed");
  const [sets, setSets] = useState<SetOption[]>([]);
  const [themeCounts, setThemeCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const topRetiringSoon = useMemo(() => {
    return [...getAllRetiringSoonEntries()]
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 3);
  }, []);

  const topOpportunities = useMemo(() => {
    return getAllMarketOpportunities().slice(0, 3);
  }, []);

  useEffect(() => {
    fetch("/api/sets")
      .then((res) => res.json())
      .then((data: { sets: SetOption[] }) => setSets(data.sets))
      .catch(() => setError("Could not load set catalogue."));

    Promise.all(
      BROWSE_CATEGORIES.map(async (cat) => {
        const res = await fetch(
          `/api/search?theme=${encodeURIComponent(cat.theme)}`,
        );
        const data = await res.json();
        return { theme: cat.theme, count: (data.results ?? []).length };
      }),
    )
      .then((rows) => {
        const counts: Record<string, number> = {};
        for (const row of rows) counts[row.theme] = row.count;
        setThemeCounts(counts);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submitSearchFromQuery(
      searchQuery,
      condition,
      router,
      setError,
      () => setError(""),
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      <main className="page-main mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Should you sell or hold?
          </h2>
          <p className="mt-3 text-zinc-400">
            Search by set number or name to get estimated value, list price, and
            a SELL / HOLD recommendation.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-xl shadow-black/20 sm:p-6"
        >
          <SetSearchInput
            query={searchQuery}
            onQueryChange={setSearchQuery}
            condition={condition}
            onError={setError}
            onClearError={() => setError("")}
          />
          <p className="mt-2 text-sm text-[#f59e0b]/80">
            Tip: Retired sets often command 2–3× their original retail price
          </p>

          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-medium text-zinc-300">
              Condition
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CONDITIONS.map((c) => (
                <label
                  key={c.value}
                  className={`cursor-pointer rounded-xl border px-4 py-4 transition-colors sm:py-3 ${
                    condition === c.value
                      ? "border-[#f2cd00] bg-[#f2cd00]/10 ring-1 ring-[#f2cd00]/50"
                      : "border-zinc-700 bg-zinc-950 hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={c.value}
                    checked={condition === c.value}
                    onChange={() => setCondition(c.value)}
                    className="sr-only"
                  />
                  <span className="block font-medium text-white">{c.label}</span>
                  <span className="mt-0.5 block text-sm text-zinc-500">
                    {c.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="mt-4 text-sm text-[#f59e0b]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="touch-target mt-6 w-full rounded-xl bg-[#f2cd00] py-3.5 text-center font-semibold text-zinc-900 transition hover:bg-[#ffe033] focus:outline-none focus:ring-2 focus:ring-[#f2cd00] focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Analyse
          </button>
        </form>

        {topOpportunities.length > 0 && (
          <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#fbbf24]">
                🔥 Top Opportunities
              </h3>
              <Link
                href="/opportunities"
                className="text-xs font-semibold text-[#f59e0b] hover:underline"
              >
                View all →
              </Link>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Highest-scoring sets for buying or holding right now
            </p>
            <div className="filter-scroll -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
              {topOpportunities.map((entry) => (
                <Link
                  key={entry.set.number}
                  href={`/results?set=${encodeURIComponent(entry.set.number)}&condition=sealed`}
                  className="w-[min(85vw,260px)] shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-[#f59e0b]/50 md:w-auto"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-white">
                      {entry.set.name}
                    </p>
                    <span className="shrink-0 text-lg font-bold text-white">
                      {entry.opportunity.opportunityScore}
                    </span>
                  </div>
                  <span
                    className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${buySignalClassName(entry.opportunity.buySignal)}`}
                  >
                    {entry.opportunity.buySignal}
                  </span>
                  <p className="mt-3 text-xs font-semibold text-[#f59e0b]">
                    View →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {topRetiringSoon.length > 0 && (
          <section className="mt-8 rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#fbbf24]">
                ⚠️ Retiring Soon
              </h3>
              <Link
                href="/retiring-soon"
                className="text-xs font-semibold text-[#f59e0b] hover:underline"
              >
                View all →
              </Link>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Top opportunities before retirement — act before supply drops
            </p>
            <div className="filter-scroll -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
              {topRetiringSoon.map((entry) => {
                const tierStyle =
                  entry.tier === "imminent"
                    ? "border-red-500/40 bg-red-950/20"
                    : entry.tier === "soon"
                      ? "border-[#f59e0b]/40 bg-[#f59e0b]/10"
                      : "border-yellow-400/30 bg-yellow-400/5";
                const tierLabel =
                  entry.tier === "imminent"
                    ? "Imminent"
                    : entry.tier === "soon"
                      ? "Soon"
                      : "Upcoming";
                return (
                  <Link
                    key={entry.set.number}
                    href={`/results?set=${encodeURIComponent(entry.set.number)}&condition=sealed`}
                    className={`w-[min(85vw,260px)] shrink-0 rounded-xl border p-4 transition hover:border-[#f59e0b]/60 md:w-auto ${tierStyle}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs font-bold text-[#f59e0b]">
                        {entry.set.number}
                      </p>
                      <span className="shrink-0 rounded-md bg-zinc-900/80 px-2 py-0.5 text-xs font-bold text-[#f59e0b]">
                        {entry.opportunityScore}/100
                      </span>
                    </div>
                    <p className="mt-1 truncate font-semibold text-white">
                      {entry.set.name}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${RETIRING_TIER_CONFIG[entry.tier].badgeClass}`}
                    >
                      {tierLabel}
                    </span>
                    <p className="mt-3 text-xs font-semibold text-[#f59e0b]">
                      Analyse →
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Browse by category
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {BROWSE_CATEGORIES.map((cat) => (
              <Link
                key={cat.theme}
                href={`/browse?theme=${encodeURIComponent(cat.theme)}`}
                className="rounded-full border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm transition hover:border-[#f59e0b]/50 hover:bg-[#f59e0b]/10"
              >
                <span className="font-medium text-white">{cat.label}</span>
                <span className="ml-2 text-xs text-zinc-500">
                  ({themeCounts[cat.theme] ?? "…"})
                </span>
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-6 text-center text-sm text-[#f59e0b]/80">
          📊 Pricing data manually updated from BrickLink &amp; eBay sold listings
          · Last updated 1 May 2026
        </p>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Pricing data is estimated. Always verify before listing.
        </p>
      </main>
    </div>
  );
}
