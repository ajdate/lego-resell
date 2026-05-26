"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfidenceCompactBadge } from "@/components/ConfidenceDisplay";
import { isSetRetired, isSetRetiringSoon } from "@/lib/analyze";
import { addToPortfolio } from "@/lib/portfolio";
import type { RetiringSoonEntry } from "@/lib/retiring-soon";
import { DualPrice, DualPriceInline } from "@/components/DualPrice";
import { addToWatchlist } from "@/lib/watchlist";

function RecBadge({ rec }: { rec: "SELL" | "HOLD" }) {
  const isSell = rec === "SELL";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
        isSell
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-[#f59e0b]/20 text-[#f59e0b]"
      }`}
    >
      {rec}
    </span>
  );
}

export function RetiringSoonSetCard({
  entry,
  onWatchlistChange,
  onPortfolioChange,
  inWatchlist,
  inPortfolio,
}: {
  entry: RetiringSoonEntry;
  onWatchlistChange: () => void;
  onPortfolioChange: () => void;
  inWatchlist: boolean;
  inPortfolio: boolean;
}) {
  const { set, analysis, tierConfig, confidence, opportunityScore, opportunityLabel } =
    entry;
  const [whyOpen, setWhyOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [watchAdded, setWatchAdded] = useState(false);
  const [portfolioAdded, setPortfolioAdded] = useState(false);

  function handleWatch() {
    if (inWatchlist || watchAdded) return;
    addToWatchlist({
      setNumber: set.number,
      name: set.name,
      theme: set.theme,
      recommendation: analysis.recommendation,
      recommendationAtAdd: analysis.recommendation,
      estimatedValue: analysis.estimatedValue,
      dateAdded: new Date().toISOString(),
      retiredAtAdd: isSetRetired(set) ? true : false,
      retiringSoonAtAdd: isSetRetiringSoon(set),
    });
    setWatchAdded(true);
    onWatchlistChange();
  }

  function confirmPortfolio() {
    const price = parseFloat(purchasePrice);
    if (Number.isNaN(price) || price < 0) return;
    addToPortfolio({
      setNumber: set.number,
      name: set.name,
      theme: set.theme,
      condition: "sealed",
      purchasePrice: price,
      estimatedValue: analysis.estimatedValue,
      suggestedListPrice: analysis.recommendedListPrice,
      recommendation: analysis.recommendation,
      quantity: 1,
    });
    setPortfolioAdded(true);
    setShowPurchase(false);
    onPortfolioChange();
  }

  const watching = inWatchlist || watchAdded;
  const inPort = inPortfolio || portfolioAdded;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-zinc-800 border-l-4 bg-zinc-900/50 ${tierConfig.borderClass}`}
    >
      <div className="border-b border-zinc-800/80 bg-zinc-950/40 px-4 py-3 text-xs text-zinc-300">
        {tierConfig.timingAdvice}
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-bold text-[#f59e0b]">
              {set.number}
            </p>
            <h3 className="text-lg font-bold text-white">{set.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {set.theme}
              </span>
              <RecBadge rec={analysis.recommendation} />
              <ConfidenceCompactBadge result={confidence} />
              <span
                className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${tierConfig.badgeClass}`}
              >
                {tierConfig.monthsLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {set.pieces.toLocaleString()} pieces · {set.year}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Opportunity Score</p>
            <p className="text-2xl font-bold text-[#f59e0b]">
              {opportunityScore}
              <span className="text-sm text-zinc-600">/100</span>
            </p>
            <p className="text-xs font-medium text-zinc-400">{opportunityLabel}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">Est. value</p>
            <DualPrice audAmount={analysis.estimatedValue} size="sm" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Suggested list</p>
            <DualPrice audAmount={analysis.recommendedListPrice} size="sm" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Urgency</span>
            <span>{tierConfig.monthsLabel}</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${tierConfig.barClass}`}
              style={{ width: `${tierConfig.urgencyBarPercent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setWhyOpen((o) => !o)}
          className="mt-4 text-sm font-medium text-[#f59e0b] hover:text-[#fbbf24]"
        >
          {whyOpen ? "Hide why this matters" : "Why this matters"}
        </button>
        {whyOpen && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            This set is expected to retire within 6–12 months. Post-retirement,
            supply tightens and collector demand typically drives sealed premiums
            higher. {entry.historicalInsight}.
          </p>
        )}

        <button
          type="button"
          onClick={() => setInsightOpen((o) => !o)}
          className="mt-3 text-sm font-medium text-zinc-400 hover:text-white"
        >
          {insightOpen ? "Hide investment insight" : "Investment insight"}
        </button>
        {insightOpen && (
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
            <p className="text-zinc-300">
              Est. <DualPriceInline audAmount={entry.postRetirement.low} />–
              <DualPriceInline audAmount={entry.postRetirement.high} /> within 12
              months of retirement
            </p>
            <p className="mt-2 font-medium text-emerald-400">
              Up to +{entry.postRetirement.maxUpsidePercent}% appreciation expected
            </p>
            <p className="mt-2 text-xs text-zinc-500">{entry.historicalInsight}</p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {watching ? (
            <span className="flex w-full items-center justify-center rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-3 py-3 text-xs font-semibold text-emerald-400 sm:w-auto sm:py-1.5">
              ✓ Watching
            </span>
          ) : (
            <button
              type="button"
              onClick={handleWatch}
              className="touch-target w-full rounded-lg border border-zinc-600 px-3 py-3 text-xs font-semibold text-zinc-300 hover:border-[#f59e0b] hover:text-[#f59e0b] sm:w-auto sm:py-1.5"
            >
              Watch This Set
            </button>
          )}
          {inPort ? (
            <span className="flex w-full items-center justify-center rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-3 py-3 text-xs font-semibold text-emerald-400 sm:w-auto sm:py-1.5">
              ✓ In Portfolio
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowPurchase((s) => !s)}
              className="touch-target w-full rounded-lg border border-[#f59e0b]/40 px-3 py-3 text-xs font-semibold text-[#f59e0b] hover:bg-[#f59e0b]/10 sm:w-auto sm:py-1.5"
            >
              Add to Portfolio
            </button>
          )}
          <Link
            href={`/results?set=${encodeURIComponent(set.number)}&condition=sealed`}
            className="touch-target flex w-full items-center justify-center rounded-lg border border-zinc-600 px-3 py-3 text-xs font-semibold text-zinc-300 hover:text-white sm:w-auto sm:py-1.5"
          >
            Analyse
          </Link>
        </div>

        {showPurchase && !inPort && (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-xs text-zinc-500">
                Purchase price (AUD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={confirmPortfolio}
              disabled={
                purchasePrice === "" || Number.isNaN(parseFloat(purchasePrice))
              }
              className="rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
