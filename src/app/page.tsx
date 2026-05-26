"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  SetSearchInput,
  type SetSearchInputHandle,
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

const TRUST_STATS = [
  { icon: "📦", label: "300+ Sets Tracked" },
  { icon: "💱", label: "AUD & USD Pricing" },
  { icon: "🤖", label: "AI Listing Generator" },
] as const;

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Search Your Set",
    description:
      "Enter a set number or name. Get instant market value, condition-adjusted pricing and a confidence score.",
  },
  {
    step: 2,
    title: "Get Your Recommendation",
    description:
      "See a data-backed SELL or HOLD recommendation with detailed reasoning and market context.",
  },
  {
    step: 3,
    title: "Generate Your Listing",
    description:
      "One click generates a polished, collector-focused marketplace listing ready to post on Facebook or eBay.",
  },
] as const;

const FEATURES = [
  {
    icon: "📊",
    title: "Portfolio Tracker",
    description:
      "Track every set you own with purchase price, condition and intent. See your total collection value and profit in real time.",
  },
  {
    icon: "🔔",
    title: "Smart Alerts",
    description:
      "Get notified when recommendations change, sets retire, or values spike. The app monitors your collection so you don't have to.",
  },
  {
    icon: "⚠️",
    title: "Retirement Monitor",
    description:
      "Sets approaching retirement are tracked and scored. Know before the market does.",
  },
  {
    icon: "🔥",
    title: "Opportunity Finder",
    description:
      "Every set scored for investment potential. Find what to buy before it retires.",
  },
  {
    icon: "💱",
    title: "AUD & USD Pricing",
    description:
      "Toggle between Australian and US market pricing. Benchmark against global collector values.",
  },
  {
    icon: "🤖",
    title: "AI Listings",
    description:
      "Generate polished Facebook Marketplace and eBay listings in one click. Collector-focused language that sells.",
  },
] as const;

function LandingNav() {
  return (
    <header className="border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="BrickValue home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f59e0b] text-sm font-bold text-zinc-900">
            B
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            BrickValue
          </span>
        </Link>
        <nav
          className="hidden items-center gap-1 text-sm md:flex"
          aria-label="Main"
        >
          <Link
            href="/opportunities"
            className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-[#f59e0b]"
          >
            Opportunities
          </Link>
          <Link
            href="/retiring-soon"
            className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-[#f59e0b]"
          >
            Retiring Soon
          </Link>
          <Link
            href="/portfolio"
            className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Portfolio
          </Link>
        </nav>
      </div>
    </header>
  );
}

function scrollToSearch() {
  document.getElementById("search")?.scrollIntoView({ behavior: "smooth" });
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [condition, setCondition] = useState<Condition>("sealed");
  const [sets, setSets] = useState<SetOption[]>([]);
  const [themeCounts, setThemeCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const searchRef = useRef<SetSearchInputHandle>(null);

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
    await searchRef.current?.submit();
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <LandingNav />

      <main className="page-main mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
        {/* Hero */}
        <section className="relative border-b border-white/5 px-0 py-12 text-center sm:py-16 md:py-20">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-4"
            aria-hidden
          >
            <div className="mx-auto h-48 max-w-2xl rounded-full bg-[#f59e0b]/15 blur-3xl sm:h-64" />
          </div>
          <div className="relative">
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              Know what your{" "}
              <span className="bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent">
                LEGO
              </span>{" "}
              is{" "}
              <span className="bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent">
                worth
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Instant valuations, SELL or HOLD recommendations, and AI-powered
              marketplace listings for serious LEGO collectors and investors.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={scrollToSearch}
                className="touch-target rounded-xl bg-[#f59e0b] px-6 py-3.5 text-center text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
              >
                Analyse a Set →
              </button>
              <Link
                href="/opportunities"
                className="touch-target rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:border-[#f59e0b]/40 hover:bg-white/[0.06]"
              >
                View Opportunities →
              </Link>
            </div>
          </div>
        </section>

        {/* Trust stats */}
        <section className="border-b border-white/5 bg-white/[0.02]">
          <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {TRUST_STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-zinc-300"
              >
                <span className="text-base" aria-hidden>
                  {stat.icon}
                </span>
                <span className="font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-white/5 py-12 sm:py-14">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
            Three steps to smarter selling
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f59e0b]/20 text-sm font-bold text-[#f59e0b]">
                  {item.step}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Search */}
        <section
          id="search"
          className="scroll-mt-20 border-b border-white/5 py-12 sm:py-14"
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Analyse a Set
            </h2>
            <p className="mt-2 text-zinc-400">
              Search by set number or name to get estimated value, list price,
              and a SELL / HOLD recommendation.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-xl shadow-black/20 sm:p-6"
            >
              <SetSearchInput
                ref={searchRef}
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
                      <span className="block font-medium text-white">
                        {c.label}
                      </span>
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
          </div>
        </section>

        {/* Top opportunities — preserved */}
        {topOpportunities.length > 0 && (
          <section className="border-b border-white/5 py-10">
            <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-5">
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
            </div>
          </section>
        )}

        {/* Retiring soon — preserved */}
        {topRetiringSoon.length > 0 && (
          <section className="border-b border-white/5 py-10">
            <div className="mx-auto max-w-2xl rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] p-5">
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
            </div>
          </section>
        )}

        {/* Browse by category — preserved */}
        <section className="border-b border-white/5 py-10">
          <div className="mx-auto max-w-2xl">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Browse by category
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {BROWSE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.theme}
                  href={`/browse?theme=${encodeURIComponent(cat.theme)}`}
                  className="touch-target inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm transition hover:border-[#f59e0b]/50 hover:bg-[#f59e0b]/10"
                >
                  <span className="font-medium text-white">{cat.label}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    ({themeCounts[cat.theme] ?? "…"})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="border-b border-white/5 py-12 sm:py-14">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
            Everything a serious collector needs
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
              >
                <span className="text-2xl" aria-hidden>
                  {feature.icon}
                </span>
                <h3 className="mt-3 text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 text-center">
          <p className="text-sm font-medium text-zinc-400">
            Built for Australian LEGO collectors and investors
          </p>
          <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link
              href="/portfolio"
              className="text-zinc-500 transition hover:text-[#f59e0b]"
            >
              Portfolio
            </Link>
            <span className="text-zinc-700" aria-hidden>
              ·
            </span>
            <Link
              href="/watchlist"
              className="text-zinc-500 transition hover:text-[#f59e0b]"
            >
              Watchlist
            </Link>
            <span className="text-zinc-700" aria-hidden>
              ·
            </span>
            <Link
              href="/opportunities"
              className="text-zinc-500 transition hover:text-[#f59e0b]"
            >
              Opportunities
            </Link>
            <span className="text-zinc-700" aria-hidden>
              ·
            </span>
            <Link
              href="/retiring-soon"
              className="text-zinc-500 transition hover:text-[#f59e0b]"
            >
              Retiring Soon
            </Link>
          </nav>
          <p className="mt-6 text-sm text-[#f59e0b]/80">
            📊 Pricing data manually updated from BrickLink &amp; eBay sold
            listings · Last updated 1 May 2026
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Prices shown in AUD. Toggle to USD on any analysis page.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Pricing data is estimated. Always verify before listing.
          </p>
        </footer>
      </main>
    </div>
  );
}
