"use client";

import { useState } from "react";
import type { Condition } from "@/lib/analyze";
import { analyzeSet, findSet } from "@/lib/analyze";
import { ConfidenceCompactBadge } from "@/components/ConfidenceDisplay";
import { calculateConfidence, setDataFromLegoSet } from "@/lib/confidence";
import {
  decrementPortfolioCopy,
  formatAud,
  getConcentrationWarnings,
  incrementPortfolioCopy,
  itemPercentGain,
  itemProfitDollars,
  itemProfitPerUnit,
  removeFromPortfolio,
  updatePortfolioCopy,
  type PortfolioCopy,
  type PortfolioItem,
} from "@/lib/portfolio";
import { PortfolioRatingBadges } from "@/components/RatingBadges";
import { explanationSetFromLegoSet } from "@/lib/explanations";
import { SetHistoryIndicators } from "@/components/SetHistoryIndicators";
import {
  RetiringSoonPulseDot,
  SetScarcityBadge,
} from "@/components/SetScarcityBadge";

function conditionLabel(condition: Condition) {
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function formatDateAdded(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function QuantityBadge({ quantity }: { quantity: number }) {
  if (quantity <= 1) return null;
  return (
    <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-xs font-bold text-[#f59e0b]">
      x{quantity}
    </span>
  );
}

function CopyEditModal({
  copy,
  onSave,
  onClose,
}: {
  copy: PortfolioCopy;
  onSave: (updates: Partial<Pick<PortfolioCopy, "condition" | "purchasePrice">>) => void;
  onClose: () => void;
}) {
  const [condition, setCondition] = useState<Condition>(copy.condition);
  const [price, setPrice] = useState(String(copy.purchasePrice));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-900 p-5 sm:max-h-none sm:max-w-sm sm:rounded-2xl">
        <h4 className="text-sm font-semibold text-white">Edit copy</h4>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-3 text-base text-white md:py-2 md:text-sm"
            >
              <option value="sealed">Sealed</option>
              <option value="complete">Complete</option>
              <option value="built">Built</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Purchase price (AUD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-3 text-base text-white md:py-2 md:text-sm"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              const parsed = parseFloat(price);
              if (!Number.isNaN(parsed) && parsed >= 0) {
                onSave({ condition, purchasePrice: parsed });
              }
            }}
            className="touch-target flex-1 rounded-lg bg-[#f59e0b] py-3 text-sm font-semibold text-zinc-900 md:py-2"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PortfolioSetCard({
  item,
  concentrationPercent,
  onUpdate,
}: {
  item: PortfolioItem;
  concentrationPercent?: number;
  onUpdate: (items: PortfolioItem[]) => void;
}) {
  const [expanded, setExpanded] = useState(item.quantity > 1);
  const [editingCopy, setEditingCopy] = useState<PortfolioCopy | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const catalogueSet = findSet(item.setNumber);
  const retiringSoon =
    catalogueSet?.retiringSoon === true && catalogueSet?.retired !== true;
  const profit = itemProfitDollars(item);
  const perUnit = itemProfitPerUnit(item);
  const isSell = item.recommendation === "SELL";
  const analysis = analyzeSet(item.setNumber, item.condition);
  const confidence = analysis
    ? calculateConfidence(
        setDataFromLegoSet(
          analysis.set,
          analysis.recommendation,
          analysis.estimatedValue,
        ),
        item.condition,
      )
    : null;

  function refresh(next: PortfolioItem[]) {
    onUpdate(next);
  }

  function handleIncrement() {
    refresh(incrementPortfolioCopy(item.setNumber));
  }

  function handleDecrement() {
    if (item.quantity <= 1) {
      setConfirmRemove(true);
      return;
    }
    if (
      window.confirm(
        `Remove one copy of ${item.name}? (${item.quantity - 1} will remain)`,
      )
    ) {
      refresh(decrementPortfolioCopy(item.setNumber));
    }
  }

  function handleRemoveAll() {
    if (
      window.confirm(
        `Remove ${item.name} from your portfolio? This removes all ${item.quantity} ${item.quantity === 1 ? "copy" : "copies"}.`,
      )
    ) {
      refresh(removeFromPortfolio(item.setNumber));
    }
    setConfirmRemove(false);
  }

  return (
    <>
      <li
        className={`overflow-hidden rounded-2xl border bg-zinc-900/50 ${
          catalogueSet?.retired
            ? "border-red-900/30"
            : retiringSoon
              ? "border-[#f59e0b]/30"
              : concentrationPercent && concentrationPercent > 30
                ? "border-[#f59e0b]/40"
                : "border-zinc-800"
        } ${item.quantity > 1 ? "border-white/10 bg-white/[0.05]" : ""}`}
      >
        {concentrationPercent && concentrationPercent > 30 && (
          <div className="border-b border-[#f59e0b]/30 bg-[#f59e0b]/10 px-5 py-3 text-xs text-[#fbbf24]">
            ⚠️ High Concentration — {item.name} represents {concentrationPercent}%
            of your portfolio value
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {retiringSoon && <RetiringSoonPulseDot />}
                <p className="text-xs font-medium text-zinc-500">
                  #{item.setNumber} · {item.theme}
                </p>
                <QuantityBadge quantity={item.quantity} />
                {confidence && <ConfidenceCompactBadge result={confidence} />}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-white">{item.name}</h3>
              <div className="mt-2">
                <SetScarcityBadge set={catalogueSet} size="compact" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {conditionLabel(item.condition)}
                  {item.quantity > 1 ? " · avg" : ""}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    isSell
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-[#f59e0b]/20 text-[#f59e0b]"
                  }`}
                >
                  {item.recommendation}
                </span>
              </div>
              {analysis && confidence && (
                <div className="mt-2">
                  <PortfolioRatingBadges
                    set={explanationSetFromLegoSet(
                      analysis.set,
                      analysis.recommendation,
                      analysis.estimatedValue,
                    )}
                    condition={item.condition}
                    confidenceScore={confidence.score}
                  />
                </div>
              )}
              {analysis && (
                <SetHistoryIndicators
                  setNumber={item.setNumber}
                  recommendationAtAdd={item.recommendation}
                  currentRecommendation={analysis.recommendation}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950/60 p-0.5">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Remove copy"
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center text-base font-semibold text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-lg text-[#f59e0b] transition hover:bg-[#f59e0b]/20"
                  aria-label="Add copy"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="rounded-lg border border-zinc-600 px-3 py-1 text-xs text-zinc-400 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
              >
                {expanded ? "Hide" : "Details"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-zinc-500">Total paid</p>
              <p className="font-medium text-white">{formatAud(item.totalPaid)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Est. value</p>
              <p className="font-medium text-[#f59e0b]">
                {formatAud(item.totalEstimatedValue)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Per unit</p>
              <p className="font-medium text-zinc-300">
                {formatAud(item.purchasePrice)} → {formatAud(item.estimatedValue)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">P/L</p>
              <p
                className={`font-medium ${
                  profit >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {profit >= 0 ? "+" : ""}
                {formatAud(profit)}
                <span className="ml-1 text-xs text-zinc-500">
                  ({itemPercentGain(item)}%)
                </span>
              </p>
              {item.quantity > 1 && (
                <p className="mt-0.5 text-xs text-zinc-500">
                  {perUnit >= 0 ? "+" : ""}
                  {formatAud(perUnit)} per copy
                </p>
              )}
            </div>
          </div>

          {confirmRemove && (
            <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 p-4">
              <p className="text-sm text-zinc-300">
                Remove last copy? This will delete the set from your portfolio.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleRemoveAll}
                  className="rounded-lg bg-red-900/60 px-3 py-1.5 text-xs font-semibold text-red-300"
                >
                  Remove set
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleIncrement}
              className="rounded-lg border border-[#f59e0b]/40 px-3 py-1 text-xs font-medium text-[#f59e0b] transition hover:bg-[#f59e0b]/10"
            >
              + Copy
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-500 transition hover:border-red-800 hover:text-red-400"
            >
              Remove set
            </button>
          </div>
        </div>

        {expanded && item.copies.length > 0 && (
          <ul className="space-y-3 border-t border-white/10 px-3 pb-4 pt-3">
            {item.copies.map((copy, index) => (
              <li
                key={copy.id}
                className="ml-4 rounded-xl border-l-2 border-[#f59e0b]/30 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-zinc-500">Copy {index + 1}</p>
                    <span className="mt-1 inline-block rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                      {conditionLabel(copy.condition)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCopy(copy)}
                    className="rounded-lg border border-zinc-600 px-2 py-1 text-xs text-zinc-400 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-zinc-500">Paid</p>
                    <p className="text-white">{formatAud(copy.purchasePrice)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Added</p>
                    <p className="text-zinc-400">{formatDateAdded(copy.dateAdded)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </li>

      {editingCopy && (
        <CopyEditModal
          copy={editingCopy}
          onSave={(updates) => {
            refresh(
              updatePortfolioCopy(item.setNumber, editingCopy.id, updates),
            );
            setEditingCopy(null);
          }}
          onClose={() => setEditingCopy(null)}
        />
      )}
    </>
  );
}

export function PortfolioSetList({
  items,
  onUpdate,
}: {
  items: PortfolioItem[];
  onUpdate: (items: PortfolioItem[]) => void;
}) {
  const warnings = getConcentrationWarnings(items);
  const warningBySet = new Map(
    warnings.map((w) => [w.setNumber, w.percent]),
  );

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <PortfolioSetCard
          key={item.setNumber}
          item={item}
          concentrationPercent={warningBySet.get(item.setNumber)}
          onUpdate={onUpdate}
        />
      ))}
    </ul>
  );
}
