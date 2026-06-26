"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildProfitCalculatorHref } from "@/lib/profit-calculator-url";
import { buildSimulatorHref } from "@/lib/simulator-url";
import type { Analysis, PortfolioCondition } from "@/lib/analyze-types";
import { isSetRetired } from "@/lib/analyze-types";
import { getTierForSetNumber } from "@/lib/retiring-soon";
import { fetchSetAnalysis } from "@/lib/set-analysis-client";
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
import { CURRENCY_LABELS, useCurrency } from "@/src/lib/currencyContext";
import { explanationSetFromLegoSet } from "@/lib/explanations";
import { SetHistoryIndicators } from "@/components/SetHistoryIndicators";

function formatDateAdded(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
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
import { PriceTargetMiniProgress } from "@/components/PriceTargetCard";
import {
  calculateProgress,
  getTargetsForSet,
  resolveCurrentValue,
} from "@/lib/priceTargets";

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

  const priceLabel = `Purchase price (${CURRENCY_LABELS[currency]})`;

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
  const [expanded, setExpanded] = useState(false);
  const [editingCopy, setEditingCopy] = useState<PortfolioCopy | null>(null);
  const { formatPrice } = useCurrency();
  const primaryCondition = item.copies[0]?.condition ?? item.condition;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    void fetchSetAnalysis(item.setNumber, primaryCondition).then(setAnalysis);
  }, [item.setNumber, primaryCondition]);

  const catalogueSet = analysis?.set;
  const retiringSoon = getTierForSetNumber(item.setNumber) !== null;
  const profit = itemProfitDollars(item);
  const profitPct =
    item.totalPaid > 0 ? Math.round((profit / item.totalPaid) * 100) : 0;
  const resultsCondition =
    primaryCondition === "damaged-box" ? "sealed" : primaryCondition;
  const resultsHref = `/results?set=${encodeURIComponent(item.setNumber)}&condition=${encodeURIComponent(resultsCondition)}`;
  const earliestAdded = item.copies.reduce(
    (earliest, copy) =>
      copy.dateAdded < earliest ? copy.dateAdded : earliest,
    item.copies[0]?.dateAdded ?? "",
  );
  const retired = analysis ? isSetRetired(analysis.set) : false;
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

  const closestTargetProgress = useMemo(() => {
    if (!analysis) return null;
    const active = getTargetsForSet(item.setNumber).filter(
      (t) => t.status === "active",
    );
    if (active.length === 0) return null;
    const progressList = active.map((target) =>
      calculateProgress(
        target,
        resolveCurrentValue(target, [
          {
            setNumber: item.setNumber,
            estimatedValue: analysis.estimatedValue,
            condition: primaryCondition,
          },
        ]),
      ),
    );
    return progressList.sort((a, b) => b.progressPercent - a.progressPercent)[0];
  }, [analysis, item.setNumber, primaryCondition]);

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

        {/* Collapsed row — always visible */}
        <div className="flex items-center gap-3 p-4">
          <SetImage
            setNumber={item.setNumber}
            setName={item.name}
            variant="thumb"
            showSetNumberOnFallback={false}
            className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-xs text-white/40">#{item.setNumber}</span>
              <span className="text-xs text-white/40">·</span>
              <span className="truncate text-xs text-white/40">{item.theme}</span>
              {item.quantity > 1 && (
                <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                  {item.quantity}x
                </span>
              )}
            </div>
            <div className="truncate text-sm font-bold text-white">{item.name}</div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <span
                className={`text-xs font-bold ${
                  (analysis?.recommendation ?? item.recommendation) === "SELL"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {analysis?.recommendation ?? item.recommendation}
              </span>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs font-semibold text-amber-400">
                {formatPrice(item.totalEstimatedValue)}
              </span>
              <span className="text-xs text-white/30">·</span>
              <span
                className={`text-xs ${
                  profit >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {profit >= 0 ? "+" : ""}
                {formatPrice(profit)} ({profitPct >= 0 ? "+" : ""}
                {profitPct}%)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 p-1 text-white/30 transition hover:text-white/60"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse set details" : "Expand set details"}
          >
            <span
              className={`inline-block text-xs transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
        </div>

        {/* Expanded section — animate height/opacity only; top row stays fixed */}
        <div
          className={
            expanded
              ? "max-h-[500px] overflow-visible opacity-100"
              : "max-h-0 overflow-hidden opacity-0"
          }
          style={{
            transitionProperty: "max-height, opacity",
            transitionDuration: "0.3s, 0.2s",
            transitionTimingFunction: "ease, ease",
          }}
        >
            <div className="border-t border-white/5 p-4 pt-3">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {retired && (
                  <span className="rounded-full bg-red-950/80 px-2 py-0.5 text-[10px] font-bold text-red-400">
                    RETIRED
                  </span>
                )}
                {retiringSoon && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    RETIRING SOON
                  </span>
                )}
                {analysis && confidence && (
                  <PortfolioRatingBadges
                    set={explanationSetFromLegoSet(
                      analysis.set,
                      analysis.recommendation,
                      analysis.estimatedValue,
                    )}
                    condition={primaryCondition}
                    confidenceScore={confidence.score}
                  />
                )}
                {confidence && (
                  <div className="inline-flex items-center gap-1">
                    <ConfidenceCompactBadge result={confidence} />
                    <ScoreFactorPopover
                      score={confidence.score}
                      factors={toScoreFactors(confidence.factors)}
                      label="Confidence"
                    />
                  </div>
                )}
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/40">Total Paid</div>
                  <div className="text-sm font-bold text-white">
                    {formatPrice(item.totalPaid)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40">Est. Value</div>
                  <div className="text-sm font-bold text-amber-400">
                    {formatPrice(item.totalEstimatedValue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40">P/L</div>
                  <div
                    className={`text-sm font-bold ${
                      profit >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {profit >= 0 ? "+" : ""}
                    {formatPrice(profit)} ({profitPct >= 0 ? "+" : ""}
                    {profitPct}%)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40">Added</div>
                  <div className="text-sm font-bold text-white">
                    {formatDateAdded(earliestAdded)}
                  </div>
                </div>
              </div>

              <div className="mb-3 flex gap-2">
                <Link
                  href={buildSimulatorHref({
                    setA: item.setNumber,
                    condA:
                      item.condition === "complete" ? "complete" : "sealed",
                    invested: item.purchasePrice,
                    single: true,
                  })}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-center text-xs text-zinc-200 transition hover:border-amber-500/30 hover:text-amber-300"
                >
                  Simulate →
                </Link>
                <Link
                  href={buildProfitCalculatorHref({
                    set: item.setNumber,
                    sellPrice: item.suggestedListPrice,
                    buyPrice: item.copies[0]?.purchasePrice ?? item.purchasePrice,
                    condition: primaryCondition,
                  })}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-center text-xs text-zinc-200 transition hover:border-emerald-500/30 hover:text-emerald-300"
                >
                  Calc Profit
                </Link>
                <Link
                  href={resultsHref}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-center text-xs text-zinc-200 transition hover:border-amber-500/30 hover:text-amber-300"
                >
                  Analyse →
                </Link>
              </div>

              {analysis && (
                <div className="mb-3">
                  <SetHistoryIndicators
                    setNumber={item.setNumber}
                    recommendationAtAdd={item.recommendation}
                    currentRecommendation={analysis.recommendation}
                  />
                </div>
              )}

              {closestTargetProgress && (
                <div className="mb-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500">
                      Target: {formatPrice(closestTargetProgress.target.targetPrice)}{" "}
                      · {closestTargetProgress.progressPercent}% complete
                    </p>
                    <Link
                      href="/targets"
                      className="text-[10px] text-zinc-500 hover:text-[#f59e0b]"
                    >
                      View →
                    </Link>
                  </div>
                  <PriceTargetMiniProgress progress={closestTargetProgress} />
                </div>
              )}

              <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <p className="text-xs text-white/40">Intent summary</p>
                <p className="mt-1 text-sm text-zinc-300">
                  {formatIntentBreakdown(item.copies)}
                </p>
                {mixedIntent && (
                  <p className="mt-2 text-xs font-medium text-amber-300" role="alert">
                    ⚠️ Mixed strategy — ensure each copy has a clear exit plan
                  </p>
                )}
              </div>

              {item.copies.length === 1 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                        {portfolioConditionLabel(item.copies[0].condition)}
                      </span>
                      <IntentBadge tag={item.copies[0].intentTag} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCopy(item.copies[0])}
                        className="text-xs text-amber-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCopy(item.copies[0])}
                        className="text-xs text-white/30 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {item.copies[0].notes.trim() && (
                    <p className="text-xs italic text-zinc-500">
                      {item.copies[0].notes}
                    </p>
                  )}
                </div>
              ) : (
                item.copies.map((copy) => {
                  const est = copyEstimatedValueAud(item, copy);
                  const pl = copyProfitAud(item, copy);
                  const plPct = copyProfitPercent(item, copy);
                  return (
                    <div
                      key={copy.id}
                      className="mb-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 last:mb-0"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                            {portfolioConditionLabel(copy.condition)}
                          </span>
                          <IntentBadge tag={copy.intentTag} />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCopy(copy)}
                            className="text-xs text-amber-400"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCopy(copy)}
                            className="text-xs text-white/30 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/40">Paid </span>
                          <span className="font-semibold text-white">
                            {formatPrice(copy.purchasePrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40">Value </span>
                          <span className="font-semibold text-amber-400">
                            {formatPrice(est)}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40">P/L </span>
                          <span
                            className={`font-semibold ${
                              pl >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {pl >= 0 ? "+" : ""}
                            {formatPrice(pl)} ({plPct >= 0 ? "+" : ""}
                            {plPct}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40">Calc </span>
                          <Link
                            href={buildProfitCalculatorHref({
                              set: item.setNumber,
                              sellPrice: item.suggestedListPrice,
                              buyPrice: copy.purchasePrice,
                              condition: copy.condition,
                            })}
                            className="font-semibold text-emerald-400 hover:underline"
                          >
                            Profit →
                          </Link>
                        </div>
                      </div>
                      {copy.notes.trim() && (
                        <p className="mt-2 text-xs italic text-zinc-500">
                          {copy.notes}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
        </div>
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
    <ul className="space-y-3">
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
