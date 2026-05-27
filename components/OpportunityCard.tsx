"use client";

import Link from "next/link";
import { useState } from "react";
import { isSetRetired, isSetRetiringSoon } from "@/lib/analyze";
import type { MarketOpportunityEntry } from "@/lib/market-opportunities";
import { addToPortfolio } from "@/lib/portfolio";
import { DualPrice } from "@/components/DualPrice";
import { SetImage } from "@/components/SetImage";
import {
  buySignalClassName,
  tierSectionClass,
  type OpportunityTier,
} from "@/lib/opportunityScoring";
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

export function OpportunityCard({
  entry,
  tier,
  inWatchlist,
  inPortfolio,
  onWatchlistChange,
  onPortfolioChange,
}: {
  entry: MarketOpportunityEntry;
  tier: OpportunityTier;
  inWatchlist: boolean;
  inPortfolio: boolean;
  onWatchlistChange?: () => void;
  onPortfolioChange?: () => void;
}) {
  const { set, analysis, opportunity } = entry;
  const [watchAdded, setWatchAdded] = useState(false);
  const [portfolioAdded, setPortfolioAdded] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState("");
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
    onWatchlistChange?.();
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
    onPortfolioChange?.();
  }

  const watching = inWatchlist || watchAdded;
  const inPort = inPortfolio || portfolioAdded;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-zinc-800 ${tierSectionClass(tier)}`}
    >
      <div className="p-5">
        <SetImage
          setNumber={set.number}
          setName={set.name}
          variant="card-lg"
          showSetNumberOnFallback={false}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-bold text-[#f59e0b]">
              {set.number}
            </p>
            <h3 className="mt-1 text-lg font-bold text-white">{set.name}</h3>
            <span className="mt-2 inline-block rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {set.theme}
            </span>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              {opportunity.opportunityScore}
            </p>
            <p className="text-xs font-semibold text-zinc-500">
              {opportunity.opportunityLabel}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-bold ${buySignalClassName(opportunity.buySignal)}`}
          >
            {opportunity.buySignal}
          </span>
          <RecBadge rec={analysis.recommendation} />
          {opportunity.opportunityType.map((type) => (
            <span
              key={type}
              className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400"
            >
              {type}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Current</p>
            <DualPrice audAmount={analysis.estimatedValue} size="sm" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">12 month projection</p>
            <DualPrice audAmount={opportunity.projectedValue12m} size="sm" />
            <p className="text-emerald-400">+{opportunity.projectedROI12m}%</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">24 month projection</p>
            <DualPrice audAmount={opportunity.projectedValue24m} size="sm" />
            <p className="text-emerald-400">+{opportunity.projectedROI24m}%</p>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {opportunity.reasoning.slice(0, 3).map((line) => (
            <li
              key={line}
              className="flex gap-2 text-xs leading-relaxed text-zinc-400"
            >
              <span className="text-[#f59e0b]">•</span>
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/results?set=${encodeURIComponent(set.number)}&condition=sealed`}
            className="touch-target flex w-full items-center justify-center rounded-lg border border-zinc-600 px-3 py-3 text-xs font-semibold text-zinc-300 transition hover:border-[#f59e0b] hover:text-[#f59e0b] sm:w-auto sm:py-1.5"
          >
            Analyse →
          </Link>
          <button
            type="button"
            onClick={handleWatch}
            disabled={watching}
            className="touch-target w-full rounded-lg border border-zinc-600 px-3 py-3 text-xs font-semibold text-zinc-300 transition hover:border-[#f59e0b] hover:text-[#f59e0b] disabled:opacity-50 sm:w-auto sm:py-1.5"
          >
            {watching ? "On Watch List" : "Add to Watch List"}
          </button>
          {!inPort && !showPurchase ? (
            <button
              type="button"
              onClick={() => setShowPurchase(true)}
              className="touch-target w-full rounded-lg border border-[#f59e0b]/40 px-3 py-3 text-xs font-semibold text-[#f59e0b] transition hover:bg-[#f59e0b]/10 sm:w-auto sm:py-1.5"
            >
              Add to Portfolio
            </button>
          ) : inPort ? (
            <span className="flex w-full items-center justify-center rounded-lg bg-emerald-500/10 px-3 py-3 text-xs text-emerald-400 sm:w-auto sm:py-1.5">
              In Portfolio
            </span>
          ) : null}
        </div>

        {showPurchase && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Purchase price (AUD)"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-3 text-base text-white sm:max-w-[200px] md:py-2 md:text-sm"
            />
            <button
              type="button"
              onClick={confirmPortfolio}
              className="touch-target w-full rounded-lg bg-[#f59e0b] px-3 py-3 text-xs font-semibold text-zinc-900 sm:w-auto sm:py-1.5"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setShowPurchase(false)}
              className="touch-target w-full py-2 text-xs text-zinc-500 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
