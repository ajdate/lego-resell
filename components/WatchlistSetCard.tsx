"use client";

import Link from "next/link";
import { useState } from "react";
import type { Analysis, Recommendation } from "@/lib/analyze";
import { isSetRetired, isSetRetiringSoon, type LegoSet } from "@/lib/analyze";
import { ConfidenceCompactBadge } from "@/components/ConfidenceDisplay";
import { RetiringSoonPulseDot } from "@/components/SetScarcityBadge";
import type { ConfidenceResult } from "@/lib/confidence";
import { addToPortfolio, loadPortfolio } from "@/lib/portfolio";
import { useCurrency } from "@/src/lib/currencyContext";
import { formatPortfolioIntentSummary } from "@/lib/portfolio-intent";
import type { WatchlistMeta } from "@/lib/watchlist-meta";
import { SetHistoryIndicators } from "@/components/SetHistoryIndicators";
import type { WatchlistItem } from "@/lib/watchlist";

function daysSince(iso: string): number {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

function RecBadge({ rec }: { rec: Recommendation }) {
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

function ThemeBadge({ theme }: { theme: string }) {
  return (
    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
      {theme}
    </span>
  );
}

export interface WatchlistCardData {
  item: WatchlistItem;
  current: Recommendation;
  changedSinceAdd: boolean;
  confidence: ConfidenceResult | null;
  confidenceChange: string | null;
  analysis: Analysis | null;
  catalogueSet: LegoSet | undefined;
  estimatedValueUsd: number;
  meta: WatchlistMeta;
  portfolioCopyCount: number;
}

export function WatchlistSetCard({
  data,
  view,
  selected,
  onSelect,
  onRemove,
  onMetaChange,
  onPortfolioAdded,
}: {
  data: WatchlistCardData;
  view: "grid" | "list";
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onRemove: () => void;
  onMetaChange: (patch: Partial<WatchlistMeta>) => void;
  onPortfolioAdded?: () => void;
}) {
  const {
    item,
    current,
    changedSinceAdd,
    confidence,
    confidenceChange,
    catalogueSet,
    estimatedValueUsd,
    meta,
    portfolioCopyCount,
  } = data;

  const retired = isSetRetired(catalogueSet);
  const retiringSoon = isSetRetiringSoon(catalogueSet);
  const wasActiveWhenAdded =
    item.retiredAtAdd === false ||
    (item.retiredAtAdd === undefined && item.retiringSoonAtAdd !== true);
  const retiredSinceAdded = retired && wasActiveWhenAdded;
  const days = daysSince(item.dateAdded);
  const daysLabel =
    days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;

  const [showNote, setShowNote] = useState(Boolean(meta.note));
  const [noteDraft, setNoteDraft] = useState(meta.note ?? "");
  const [showTargets, setShowTargets] = useState(
    Boolean(meta.buyTargetUsd ?? meta.sellTargetUsd),
  );
  const [buyTarget, setBuyTarget] = useState(
    meta.buyTargetUsd !== undefined ? String(meta.buyTargetUsd) : "",
  );
  const [sellTarget, setSellTarget] = useState(
    meta.sellTargetUsd !== undefined ? String(meta.sellTargetUsd) : "",
  );
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState("");
  const { formatPrice } = useCurrency();
  const [portfolioAdded, setPortfolioAdded] = useState(false);

  const buyTargetNum = parseFloat(buyTarget);
  const sellTargetNum = parseFloat(sellTarget);
  const belowBuyTarget =
    !Number.isNaN(buyTargetNum) &&
    buyTargetNum > 0 &&
    estimatedValueUsd <= buyTargetNum;
  const aboveSellTarget =
    !Number.isNaN(sellTargetNum) &&
    sellTargetNum > 0 &&
    estimatedValueUsd >= sellTargetNum;

  const urgencyPercent = retiringSoon
    ? Math.max(20, Math.min(100, 100 - (days / 180) * 75))
    : 0;

  const portfolioIntentLine =
    portfolioCopyCount > 0
      ? formatPortfolioIntentSummary(item.setNumber, loadPortfolio())
      : null;

  function handleRemove() {
    if (
      window.confirm(
        `Remove ${item.name} (#${item.setNumber}) from your watch list?`,
      )
    ) {
      onRemove();
    }
  }

  function saveTargets() {
    onMetaChange({
      buyTargetUsd: buyTarget === "" ? undefined : parseFloat(buyTarget),
      sellTargetUsd: sellTarget === "" ? undefined : parseFloat(sellTarget),
    });
  }

  function confirmPortfolioAdd() {
    const analysis = data.analysis;
    if (!analysis) return;
    const price = parseFloat(purchasePrice);
    if (Number.isNaN(price) || price < 0) return;
    addToPortfolio({
      setNumber: item.setNumber,
      name: item.name,
      theme: item.theme,
      condition: "sealed",
      purchasePrice: price,
      estimatedValue: analysis.estimatedValue,
      suggestedListPrice: analysis.recommendedListPrice,
      recommendation: analysis.recommendation,
      quantity: 1,
    });
    setPortfolioAdded(true);
    setShowPurchase(false);
    onPortfolioAdded?.();
  }

  const isList = view === "list";

  return (
    <article
      className={`rounded-2xl border bg-zinc-900/50 transition ${
        selected
          ? "border-[#f59e0b]/60 ring-1 ring-[#f59e0b]/30"
          : changedSinceAdd
            ? "border-[#f59e0b]/40"
            : "border-zinc-800 hover:border-zinc-700"
      } ${isList ? "p-6" : "p-5"}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-[#f59e0b] focus:ring-[#f59e0b]/40"
          aria-label={`Select ${item.name}`}
        />
        <div className="min-w-0 flex-1">
          {confidenceChange && (
            <div
              className="mb-3 rounded-xl border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-3 py-2 text-xs font-semibold text-[#fbbf24]"
              role="alert"
            >
              {confidenceChange}
            </div>
          )}

          {changedSinceAdd && (
            <div
              className="mb-3 rounded-xl border border-[#f59e0b]/60 bg-[#f59e0b]/15 px-4 py-3 text-sm font-semibold text-[#fbbf24]"
              role="alert"
            >
              ⚡ Recommendation changed from {item.recommendationAtAdd} to{" "}
              {current} since you added this set
            </div>
          )}

          {retiringSoon && (
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#fbbf24]">
              <RetiringSoonPulseDot />
              Retiring Soon — act fast
            </div>
          )}

          {retiredSinceAdded && (
            <div className="mb-3 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-400">
              ✦ This set retired since you added it
            </div>
          )}

          {belowBuyTarget && (
            <div className="mb-3 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-400">
              ✦ Below your buy target — good time to acquire
            </div>
          )}

          {aboveSellTarget && (
            <div className="mb-3 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-xs text-[#fbbf24]">
              ⚠️ Above your sell target — consider listing
            </div>
          )}

          <div
            className={`flex flex-wrap gap-2 ${isList ? "items-start justify-between" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold text-[#f59e0b]">
                {item.setNumber}
              </p>
              <h2
                className={`font-bold text-white ${isList ? "text-xl" : "text-lg"}`}
              >
                {item.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ThemeBadge theme={item.theme} />
                {retired && (
                  <span className="rounded-md bg-red-950/80 px-2 py-0.5 text-[10px] font-bold text-red-400">
                    RETIRED
                  </span>
                )}
                {retiringSoon && (
                  <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-[10px] font-bold text-[#f59e0b]">
                    RETIRING SOON
                  </span>
                )}
                <RecBadge rec={current} />
                {confidence && <ConfidenceCompactBadge result={confidence} />}
                {portfolioIntentLine && (
                  <span className="text-xs font-medium text-[#fbbf24]">
                    {portfolioIntentLine}
                  </span>
                )}
              </div>
            </div>
            {isList && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Est. value</p>
                <p className="text-xl font-bold text-[#f59e0b]">
                  {formatPrice(estimatedValueUsd)}
                </p>
              </div>
            )}
          </div>

          {!isList && (
            <p className="mt-2 text-sm font-medium text-[#f59e0b]">
              Est. {formatPrice(estimatedValueUsd)}
            </p>
          )}

          <p className="mt-2 text-xs text-zinc-500">
            Added to watchlist: {daysLabel}
          </p>
          <SetHistoryIndicators
            setNumber={item.setNumber}
            recommendationAtAdd={item.recommendationAtAdd}
            currentRecommendation={current}
            showAnalysisCount
            showHistoryLink
          />

          {retiringSoon && (
            <div className="mt-4 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-[#fbbf24]">
                  Est. retirement in ~6 months
                </span>
                <span className="text-zinc-500">Urgency</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] transition-all duration-700"
                  style={{ width: `${urgencyPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={`/results?set=${encodeURIComponent(item.setNumber)}&condition=sealed`}
              className="touch-target flex w-full items-center justify-center rounded-lg border border-zinc-600 px-3 py-3 text-xs font-semibold text-zinc-300 transition hover:border-[#f59e0b] hover:text-[#f59e0b] sm:w-auto sm:py-1.5"
            >
              Analyse
            </Link>
            {!showPurchase ? (
              <button
                type="button"
                onClick={() => {
                  setShowPurchase(true);
                  setPurchasePrice("");
                  setPortfolioAdded(false);
                }}
                className="touch-target w-full rounded-lg border border-[#f59e0b]/40 px-3 py-3 text-xs font-semibold text-[#f59e0b] transition hover:bg-[#f59e0b]/10 sm:w-auto sm:py-1.5"
              >
                Add to Portfolio
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowNote((s) => !s)}
              className="touch-target w-full rounded-lg border border-zinc-700 px-3 py-3 text-xs text-zinc-400 transition hover:text-white sm:w-auto sm:py-1.5"
            >
              {meta.note || showNote ? "Edit Note" : "Add Note"}
            </button>
            <button
              type="button"
              onClick={() => setShowTargets((s) => !s)}
              className="touch-target w-full rounded-lg border border-zinc-700 px-3 py-3 text-xs text-zinc-400 transition hover:text-white sm:w-auto sm:py-1.5"
            >
              Set Price Target
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="touch-target w-full rounded-lg border border-zinc-700 px-3 py-3 text-xs text-zinc-500 transition hover:border-red-800 hover:text-red-400 sm:w-auto sm:py-1.5"
            >
              Remove
            </button>
          </div>

          {showPurchase && (
            <div className="bottom-clearance-actions mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
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
                onClick={confirmPortfolioAdd}
                disabled={
                  purchasePrice === "" ||
                  Number.isNaN(parseFloat(purchasePrice))
                }
                className="rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowPurchase(false)}
                className="text-xs text-zinc-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {portfolioAdded && (
            <p className="mt-2 text-xs font-semibold text-emerald-400">
              ✓ Added to portfolio
            </p>
          )}

          {showNote && (
            <div className="bottom-clearance-actions mt-3">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => onMetaChange({ note: noteDraft })}
                placeholder="e.g. Waiting for price to drop…"
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
          )}

          {showTargets && (
            <div className="bottom-clearance-actions mt-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">
                  Buy if price drops to (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  value={buyTarget}
                  onChange={(e) => setBuyTarget(e.target.value)}
                  onBlur={saveTargets}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">
                  Sell when value reaches (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  value={sellTarget}
                  onChange={(e) => setSellTarget(e.target.value)}
                  onBlur={saveTargets}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}

          {meta.note && !showNote && (
            <p className="mt-3 text-sm italic text-zinc-500">{meta.note}</p>
          )}
        </div>
      </div>
    </article>
  );
}
