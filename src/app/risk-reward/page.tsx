"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RiskRewardChart } from "@/components/RiskRewardChart";
import { getAllSets, isSetRetired, isSetRetiringSoon } from "@/lib/analyze";
import { buildRiskRewardDataset, buildThemeRiskProfiles, summarizePortfolioRisk, type RiskQuadrant } from "@/lib/riskReward";
import { loadPortfolio, type PortfolioItem } from "@/lib/portfolio";
import { loadWatchlist } from "@/lib/watchlist";

const THEMES = ["All Themes", "UCS Star Wars", "Modular", "Creator Expert", "Ideas", "Technic", "Icons"] as const;
const STATUS = ["All", "Retired", "Retiring Soon", "Active"] as const;
const QUADRANTS: RiskQuadrant[] = ["Star Investment", "Speculative", "Safe Hold", "Avoid"];

function cardTone(q: RiskQuadrant) {
  if (q === "Star Investment") return "border-emerald-500/30 bg-emerald-500/5";
  if (q === "Speculative") return "border-amber-500/30 bg-amber-500/5";
  if (q === "Safe Hold") return "border-blue-500/30 bg-blue-500/5";
  return "border-red-500/30 bg-red-500/5";
}

function qCopy(q: RiskQuadrant) {
  if (q === "Star Investment") return "High return potential, manageable risk. Core of a strong LEGO portfolio.";
  if (q === "Speculative") return "High upside but significant risk. Suitable for experienced collectors only.";
  if (q === "Safe Hold") return "Lower return but stable and reliable. Good for capital preservation.";
  return "Poor risk/reward profile. Consider selling or avoiding.";
}

export default function RiskRewardPage() {
  const [themeFilter, setThemeFilter] = useState<(typeof THEMES)[number]>("All Themes");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS)[number]>("All");
  const [highlightPortfolio, setHighlightPortfolio] = useState(true);
  const [highlightWatchlist, setHighlightWatchlist] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [activeTab, setActiveTab] = useState<RiskQuadrant>("Star Investment");
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [watchlistNumbers, setWatchlistNumbers] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    setPortfolio(loadPortfolio());
    setWatchlistNumbers(new Set(loadWatchlist().map((w) => w.setNumber)));
  }, []);

  const dataset = useMemo(() => {
    return buildRiskRewardDataset({
      setNumbers: getAllSets().map((s) => s.number),
      condition: "sealed",
      portfolio,
      watchlistNumbers,
    });
  }, [portfolio, watchlistNumbers]);

  const filtered = useMemo(() => {
    return dataset.filter((p) => {
      if (themeFilter !== "All Themes" && p.theme !== themeFilter) return false;
      if (statusFilter === "Retired" && !p.retired) return false;
      if (statusFilter === "Retiring Soon" && !p.retiringSoon) return false;
      if (statusFilter === "Active" && (p.retired || p.retiringSoon)) return false;
      return true;
    });
  }, [dataset, themeFilter, statusFilter]);

  const quadrantBuckets = useMemo(() => {
    const out: Record<RiskQuadrant, typeof filtered> = {
      "Star Investment": [],
      Speculative: [],
      "Safe Hold": [],
      Avoid: [],
    };
    for (const p of filtered) out[p.quadrant].push(p);
    for (const q of QUADRANTS) out[q].sort((a, b) => b.returnScore - a.returnScore);
    return out;
  }, [filtered]);

  const portfolioSummary = useMemo(() => summarizePortfolioRisk(dataset, portfolio), [dataset, portfolio]);
  const themeProfiles = useMemo(() => buildThemeRiskProfiles(filtered), [filtered]);

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      <AppHeader title="Risk vs Reward" subtitle="BrickValue tools" />
      <main className="page-main mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Risk vs Reward</h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">Visualise investment risk and return across LEGO sets</p>
          <span className="mt-3 inline-block rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1 text-xs font-semibold text-[#fbbf24]">
            Portfolio Intelligence
          </span>
        </div>

        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Theme</label>
              <select
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value as (typeof THEMES)[number])}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
              >
                {THEMES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${statusFilter === s ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#fbbf24]" : "border-white/10 text-zinc-400"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={highlightPortfolio} onChange={(e) => setHighlightPortfolio(e.target.checked)} className="h-4 w-4 accent-[#f59e0b]" />
              Highlight my portfolio
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={highlightWatchlist} onChange={(e) => setHighlightWatchlist(e.target.checked)} className="h-4 w-4 accent-[#f59e0b]" />
              Highlight watchlist
            </label>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} className="h-4 w-4 accent-[#f59e0b]" />
            Show set number labels
          </label>

          <div className="mt-5">
            <RiskRewardChart
              points={filtered}
              showLabels={showLabels}
              highlightPortfolio={highlightPortfolio}
              highlightWatchlist={highlightWatchlist}
            />
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          {QUADRANTS.map((q) => (
            <div key={q} className={`rounded-xl border-l-4 p-4 ${cardTone(q)}`}>
              <p className="text-sm font-bold text-white">
                {q === "Star Investment" ? "⭐" : q === "Speculative" ? "⚡" : q === "Safe Hold" ? "🛡" : "❌"} {q}: {quadrantBuckets[q].length} sets
              </p>
              <p className="mt-1 text-xs text-zinc-400">{qCopy(q)}</p>
              <button onClick={() => setActiveTab(q)} className="mt-2 text-xs font-semibold text-[#f59e0b] hover:underline">
                View sets →
              </button>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex flex-wrap gap-2">
            {QUADRANTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setActiveTab(q)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${activeTab === q ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#fbbf24]" : "border-white/10 text-zinc-400"}`}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {quadrantBuckets[activeTab].map((p) => (
              <div key={p.setNumber} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-zinc-500">#{p.setNumber} · {p.theme}</p>
                  </div>
                  <Link href={`/results?set=${encodeURIComponent(p.setNumber)}&condition=sealed`} className="text-xs font-semibold text-[#f59e0b] hover:underline">
                    Analyse →
                  </Link>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <p>Return: <span className="text-white">{p.returnScore}</span></p>
                  <p>Risk: <span className="text-white">{p.riskScore}</span></p>
                  <p>Volatility: <span className="text-white">{p.volatilityScore}</span></p>
                  <p>Liquidity: <span className="text-white">{p.liquidityScore}</span></p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {portfolioSummary && (
          <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#f59e0b]">Portfolio Risk Summary</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <p className="text-sm text-zinc-300">Your portfolio weighted risk score: <span className="font-semibold text-white">{portfolioSummary.weightedRiskScore}/100</span></p>
              <p className="text-sm text-zinc-300">Your portfolio weighted return score: <span className="font-semibold text-white">{portfolioSummary.weightedReturnScore}/100</span></p>
              <p className="text-sm text-zinc-300">Portfolio quadrant: <span className="font-semibold text-white">{portfolioSummary.portfolioQuadrant}</span></p>
              <p className="text-sm text-zinc-300">{portfolioSummary.starPercent}% of your sets are in Star Investment quadrant</p>
              <p className="text-sm text-zinc-300">{portfolioSummary.speculativePercent}% are in Speculative — monitor closely</p>
            </div>
            {portfolioSummary.rebalanceSuggestion && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {portfolioSummary.rebalanceSuggestion}
              </p>
            )}
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#f59e0b]">Theme risk profile</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-2">Theme</th>
                  <th className="py-2 px-2">Avg Return</th>
                  <th className="py-2 px-2">Avg Risk</th>
                  <th className="py-2 px-2">Avg Volatility</th>
                  <th className="py-2 px-2">Quadrant</th>
                </tr>
              </thead>
              <tbody>
                {themeProfiles.map((t, i) => (
                  <tr key={t.theme} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                    <td className="py-2 pr-2 text-zinc-200">{t.theme}</td>
                    <td className="py-2 px-2 text-white">{t.avgReturn}</td>
                    <td className="py-2 px-2 text-white">{t.avgRisk}</td>
                    <td className="py-2 px-2 text-white">{t.avgVolatility}</td>
                    <td className="py-2 px-2 text-zinc-300">{t.quadrant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

