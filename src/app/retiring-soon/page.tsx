"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RetiringSoonSetCard } from "@/components/RetiringSoonSetCard";
import { loadPortfolio } from "@/lib/portfolio";
import {
  getRetiringSoonSummary,
  RETIRING_TIER_CONFIG,
  TIER_ORDER,
  type RetiringSoonEntry,
  type UrgencyTier,
} from "@/lib/retiring-soon";
import { isOnWatchlist, loadWatchlist } from "@/lib/watchlist";
import { useCurrency } from "@/src/lib/currencyContext";

export default function RetiringSoonPage() {
  const { formatDualLine } = useCurrency();
  const [entries, setEntries] = useState<RetiringSoonEntry[]>([]);
  const [watchlistNumbers, setWatchlistNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [portfolioNumbers, setPortfolioNumbers] = useState<
    Record<string, number>
  >({});
  const [educationOpen, setEducationOpen] = useState(false);

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

  useEffect(() => {
    fetch("/api/retiring-soon")
      .then((res) => res.json())
      .then((data: { results?: RetiringSoonEntry[] }) => {
        setEntries(data.results ?? []);
      })
      .catch(() => setEntries([]));
  }, []);

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

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <button
            type="button"
            onClick={() => setEducationOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-base font-bold text-white">
              Why retirement matters for LEGO investors
            </h2>
            <span className="text-[#f59e0b]">{educationOpen ? "↑" : "↓"}</span>
          </button>
          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: educationOpen ? "900px" : "0px" }}
          >
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Phase 1 — Pre-Retirement
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  Sets in production appreciate slowly (2-5% per year). Supply is stable and retail prices anchor the secondary market.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  Phase 2 — Retirement Event
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  When LEGO discontinues a set, secondary market prices typically spike 25-40% within the first year. Supply permanently stops while demand from collectors continues.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Phase 3 — Post-Retirement
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  Appreciation continues but moderates to 5-15% per year. Scarcity compounds over time as sealed examples become harder to find. Vintage sets (5+ years retired) often command the highest premiums.
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-sm text-[#fbbf24]">
              Holding through retirement has historically added 30-50% more than selling before retirement — for most collectors, patience is the strategy.
            </p>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile
            label="Sets tracked"
            value={String(summary.total)}
          />
          <SummaryTile
            label="Combined est. value"
            value={formatDualLine(summary.combinedValue)}
          />
          <SummaryTile
            label="Avg opportunity score"
            value={`${summary.avgOpportunity}/100`}
          />
          <SummaryTile
            label="Est. uplift if held"
            value={formatDualLine(summary.estimatedUplift)}
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
