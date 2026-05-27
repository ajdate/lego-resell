"use client";

import Link from "next/link";
import { useState } from "react";
import { buildProfitCalculatorHref } from "@/lib/profit-calculator-url";
import type { PortfolioCondition } from "@/lib/analyze";
import { analyzeSet, findSet } from "@/lib/analyze";
import { ConfidenceCompactBadge } from "@/components/ConfidenceDisplay";
import { ScoreFactorPopover } from "@/components/ScoreFactorPopover";
import { toScoreFactors } from "@/lib/score-utils";
import { IntentBadge } from "@/components/IntentBadge";
import { IntentPicker } from "@/components/IntentPicker";
import { calculateConfidence, setDataFromLegoSet } from "@/lib/confidence";
import {
  formatPortfolioExportSummary,
  getConcentrationWarnings,
  itemProfitDollars,
  removePortfolioCopy,
  updatePortfolioCopy,
  type PortfolioCopy,
  type PortfolioItem,
} from "@/lib/portfolio";
import {
  formatIntentBreakdown,
  hasMixedIntentStrategy,
  portfolioConditionLabel,
  PORTFOLIO_CONDITIONS,
  copyEstimatedValueAud,
  copyProfitAud,
  copyProfitPercent,
  type IntentTag,
} from "@/lib/portfolio-intent";
import { PortfolioRatingBadges } from "@/components/RatingBadges";
import { useCurrency } from "@/src/lib/currencyContext";
import { explanationSetFromLegoSet } from "@/lib/explanations";
import { SetHistoryIndicators } from "@/components/SetHistoryIndicators";
import {
  RetiringSoonPulseDot,
  SetScarcityBadge,
} from "@/components/SetScarcityBadge";

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

import { ModalSheet } from "@/components/ModalSheet";
import { SetImage } from "@/components/SetImage";

function CopyEditModal({
  copy,
  onSave,
  onClose,
}: {
  copy: PortfolioCopy;
  onSave: (
    updates: Partial<
      Pick<
        PortfolioCopy,
        "condition" | "purchasePrice" | "intentTag" | "notes"
      >
    >,
  ) => void;
  onClose: () => void;
}) {
  const [condition, setCondition] = useState<PortfolioCondition>(copy.condition);
  const [price, setPrice] = useState(String(copy.purchasePrice));
  const [intentTag, setIntentTag] = useState<IntentTag>(copy.intentTag);
  const [notes, setNotes] = useState(copy.notes);
  const [priceError, setPriceError] = useState("");
  const { currency } = useCurrency();

  const priceLabel =
    currency === "AUD" ? "Purchase price (AUD)" : "Purchase price (USD)";

  function handleSave() {
    const parsed = parseFloat(price);
    if (price === "" || Number.isNaN(parsed) || parsed < 0) {
      setPriceError("Enter a valid purchase price (0 or greater).");
      return;
    }
    setPriceError("");
    onSave({ condition, purchasePrice: parsed, intentTag, notes });
  }

  return (
    <ModalSheet
      title="Edit copy"
      titleId="copy-edit-title"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="touch-target flex-1 rounded-lg bg-[#f59e0b] py-3 text-sm font-semibold text-zinc-900 md:py-2"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Condition</label>
          <select
            value={condition}
            onChange={(e) =>
              setCondition(e.target.value as PortfolioCondition)
            }
            className="h-12 w-full appearance-none rounded-lg border border-white/10 bg-[#0a0a0a] px-3 text-base leading-normal text-white"
            style={{ fontSize: "16px" }}
          >
            {PORTFOLIO_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">{priceLabel}</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setPriceError("");
            }}
            className="h-12 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 text-base leading-normal text-white"
            style={{ fontSize: "16px" }}
          />
          {priceError && (
            <p className="mt-1 text-xs text-red-400" role="alert">
              {priceError}
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-400">Intent</p>
          <IntentPicker value={intentTag} onChange={setIntentTag} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Notes (optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-base leading-normal text-white placeholder:text-zinc-600"
            style={{ fontSize: "16px" }}
            placeholder="e.g. List after Christmas…"
          />
        </div>
      </div>
    </ModalSheet>
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
  const [expanded, setExpanded] = useState(true);
  const [editingCopy, setEditingCopy] = useState<PortfolioCopy | null>(null);
  const { formatPrice } = useCurrency();

  const catalogueSet = findSet(item.setNumber);
  const retiringSoon =
    catalogueSet?.retiringSoon === true && catalogueSet?.retired !== true;
  const profit = itemProfitDollars(item);
  const isSell = item.recommendation === "SELL";
  const primaryCondition = item.copies[0]?.condition ?? item.condition;
  const analysis = analyzeSet(item.setNumber, primaryCondition);
  const confidence = analysis
    ? calculateConfidence(
        setDataFromLegoSet(
          analysis.set,
          analysis.recommendation,
          analysis.estimatedValue,
        ),
        primaryCondition,
      )
    : null;
  const mixedIntent = hasMixedIntentStrategy(item.copies);

  function refresh(next: PortfolioItem[]) {
    onUpdate(next);
  }

  function handleRemoveCopy(copy: PortfolioCopy) {
    if (
      !window.confirm(
        `Remove copy #${item.copies.findIndex((c) => c.id === copy.id) + 1} of ${item.name}?`,
      )
    ) {
      return;
    }
    refresh(removePortfolioCopy(item.setNumber, copy.id));
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
        }`}
      >
        {concentrationPercent && concentrationPercent > 30 && (
          <div className="border-b border-[#f59e0b]/30 bg-[#f59e0b]/10 px-5 py-3 text-xs text-[#fbbf24]">
            ⚠️ High Concentration — {item.name} represents {concentrationPercent}%
            of your portfolio value
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SetImage
              setNumber={item.setNumber}
              setName={item.name}
              variant="thumb"
              showSetNumberOnFallback={false}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {retiringSoon && <RetiringSoonPulseDot />}
                <p className="text-xs font-medium text-zinc-500">
                  #{item.setNumber} · {item.theme}
                </p>
                <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-xs font-bold text-[#f59e0b]">
                  {item.quantity} {item.quantity === 1 ? "copy" : "copies"}
                </span>
                {confidence && (
                  <div className="flex items-center gap-1">
                    <ConfidenceCompactBadge result={confidence} />
                    <ScoreFactorPopover
                      score={confidence.score}
                      factors={toScoreFactors(confidence.factors)}
                      label="Confidence"
                    />
                  </div>
                )}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-white">{item.name}</h3>
              <div className="mt-2">
                <SetScarcityBadge set={catalogueSet} size="compact" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
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
                    condition="sealed"
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

            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-400 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-zinc-500">Total paid</p>
              <p className="font-medium text-white">{formatPrice(item.totalPaid)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Est. value</p>
              <p className="font-medium text-[#f59e0b]">
                {formatPrice(item.totalEstimatedValue)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Combined P/L</p>
              <p
                className={`font-medium ${
                  profit >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {profit >= 0 ? "+" : ""}
                {formatPrice(profit)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
            <p className="text-xs text-zinc-500">Intent summary</p>
            <p className="mt-1 text-sm text-zinc-300">
              {formatIntentBreakdown(item.copies)}
            </p>
            {mixedIntent && (
              <p className="mt-2 text-xs font-medium text-[#fbbf24]" role="alert">
                ⚠️ Mixed strategy detected — ensure each copy has a clear exit
                plan
              </p>
            )}
          </div>
        </div>

        {expanded && (
          <ul className="space-y-3 border-t border-white/10 px-3 pb-4 pt-3">
            {item.copies.map((copy, index) => {
              const est = copyEstimatedValueAud(item, copy);
              const pl = copyProfitAud(item, copy);
              const plPct = copyProfitPercent(item, copy);
              return (
                <li
                  key={copy.id}
                  className="ml-4 rounded-xl border-l-2 border-[#f59e0b]/20 bg-white/[0.02] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-zinc-400">
                        Copy #{index + 1}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                          {portfolioConditionLabel(copy.condition)}
                        </span>
                        <IntentBadge tag={copy.intentTag} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={buildProfitCalculatorHref({
                          set: item.setNumber,
                          sellPrice: item.suggestedListPrice,
                          buyPrice: copy.purchasePrice,
                          condition: copy.condition,
                        })}
                        className="rounded-lg border border-emerald-800/40 px-2 py-1 text-xs text-emerald-400 transition hover:border-emerald-500"
                      >
                        Calc profit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingCopy(copy)}
                        className="rounded-lg border border-zinc-600 px-2 py-1 text-xs text-zinc-400 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCopy(copy)}
                        className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-500 transition hover:border-red-800 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-zinc-500">Paid</p>
                      <p className="text-white">{formatPrice(copy.purchasePrice)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Est. value</p>
                      <p className="text-[#f59e0b]">{formatPrice(est)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">P/L</p>
                      <p
                        className={
                          pl >= 0 ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {pl >= 0 ? "+" : ""}
                        {formatPrice(pl)} ({plPct >= 0 ? "+" : ""}
                        {plPct}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Added</p>
                      <p className="text-zinc-400">{formatDateAdded(copy.dateAdded)}</p>
                    </div>
                  </div>

                  {copy.notes.trim() && (
                    <p className="mt-2 text-sm italic text-zinc-500">
                      {copy.notes}
                    </p>
                  )}
                </li>
              );
            })}
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

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        No sets match this intent filter.
      </p>
    );
  }

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
