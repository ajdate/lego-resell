"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RetiringSoonSetCard } from "@/components/RetiringSoonSetCard";
import { loadPortfolio } from "@/lib/portfolio";
import {
  getAllRetiringSoonEntries,
  getRetiringSoonSummary,
  RETIRING_TIER_CONFIG,
  TIER_ORDER,
  formatUsd,
  type RetiringSoonEntry,
  type UrgencyTier,
} from "@/lib/retiring-soon";
import { isOnWatchlist, loadWatchlist } from "@/lib/watchlist";

export default function RetiringSoonPage() {
  const [entries] = useState<RetiringSoonEntry[]>(() =>
    getAllRetiringSoonEntries(),
  );
  const [watchlistNumbers, setWatchlistNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [portfolioNumbers, setPortfolioNumbers] = useState<
    Record<string, number>
  >({});

  const refreshStatus = useCallback(() => {
    const wl = loadWatchlist();
    setWatchlistNumbers(new Set(wl.map((i) => i.setNumber)));
    const pf = loadPortfolio();
    const counts: Record<string, number> = {};
    for (const item of pf) {
      counts[item.setNumber] = item.quantity;
    }
    setPortfolioNumbers(counts);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const summary = useMemo(() => getRetiringSoonSummary(entries), [entries]);

  const byTier = useMemo(() => {
    const map: Record<UrgencyTier, RetiringSoonEntry[]> = {
      imminent: [],
      soon: [],
      upcoming: [],
    };
    for (const entry of entries) {
      map[entry.tier].push(entry);
    }
    return map;
  }, [entries]);

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader />

      <main className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Retiring Soon</h1>
          <span className="rounded-full bg-[#f59e0b]/20 px-3 py-0.5 text-sm font-bold text-[#f59e0b]">
            {summary.total} {summary.total === 1 ? "set" : "sets"}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Sets expected to retire within 6–12 months. Act before supply drops.
        </p>

        <div
          className="mt-6 rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-5 py-4 text-sm leading-relaxed text-[#fbbf24]"
          role="alert"
        >
          ⚠️ Retired sets typically appreciate 20–60% in the first 2 years
          post-retirement. These sets are approaching that window.
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile
            label="Sets tracked"
            value={String(summary.total)}
          />
          <SummaryTile
            label="Combined est. value"
            value={formatUsd(summary.combinedValue)}
          />
          <SummaryTile
            label="Avg opportunity score"
            value={`${summary.avgOpportunity}/100`}
          />
          <SummaryTile
            label="Est. uplift if held"
            value={formatUsd(summary.estimatedUplift)}
            hint="40% of current value across all sets"
          />
        </div>

        <div className="mt-10 space-y-10">
          {TIER_ORDER.map((tier) => {
            const tierEntries = byTier[tier];
            if (tierEntries.length === 0) return null;
            const config = RETIRING_TIER_CONFIG[tier];
            return (
              <section key={tier}>
                <h2
                  className={`border-l-4 pl-4 text-lg font-bold ${config.borderClass} ${
                    tier === "imminent"
                      ? "text-red-400"
                      : tier === "soon"
                        ? "text-[#fbbf24]"
                        : "text-yellow-300"
                  }`}
                >
                  {config.title}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {tierEntries.map((entry) => (
                    <RetiringSoonSetCard
                      key={entry.set.number}
                      entry={entry}
                      inWatchlist={watchlistNumbers.has(entry.set.number)}
                      inPortfolio={(portfolioNumbers[entry.set.number] ?? 0) > 0}
                      onWatchlistChange={refreshStatus}
                      onPortfolioChange={refreshStatus}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {entries.length === 0 && (
          <p className="mt-12 text-center text-zinc-500">
            No retiring-soon sets found in the catalogue.
          </p>
        )}

        <p className="mt-10 text-center text-sm text-zinc-500">
          <Link href="/" className="text-[#f59e0b] hover:underline">
            ← Back to search
          </Link>
        </p>
      </main>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}
