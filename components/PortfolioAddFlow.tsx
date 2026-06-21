"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analyzeSet, type Analysis, type PortfolioCondition } from "@/lib/analyze";
import { IntentPicker } from "@/components/IntentPicker";
import {
  addToPortfolio,
  getPortfolioItem,
  loadPortfolio,
  type PortfolioItem,
} from "@/lib/portfolio";
import { useCurrency } from "@/src/lib/currencyContext";
import {
  formatIntentBreakdown,
  PORTFOLIO_CONDITIONS,
  type IntentTag,
} from "@/lib/portfolio-intent";
import { saveGrowthSnapshot } from "@/lib/growthTracking";

type Step = "idle" | "details" | "intent";

export function PortfolioAddFlow({
  analysis,
  onAdded,
}: {
  analysis: Analysis;
  onAdded?: (copyCount: number) => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [portfolioCondition, setPortfolioCondition] =
    useState<PortfolioCondition>(analysis.condition);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [intentTag, setIntentTag] = useState<IntentTag>("undecided");
  const [notes, setNotes] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const { formatPrice, currency } = useCurrency();
  const priceLabel =
    currency === "AUD" ? "Purchase price per copy (AUD)" : "Purchase price per copy (USD)";

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    setPortfolio(loadPortfolio());
  }, []);

  const existing = getPortfolioItem(portfolio, analysis.set.number);
  const copyCount = existing?.quantity ?? 0;

  const parsedPrice = parseFloat(purchasePrice);
  const priceValid =
    purchasePrice !== "" && !Number.isNaN(parsedPrice) && parsedPrice >= 0;

  function resetFlow() {
    setStep("idle");
    setPurchasePrice("");
    setQuantity(1);
    setIntentTag("undecided");
    setNotes("");
    setPortfolioCondition(analysis.condition);
  }

  function startAdd() {
    setJustAdded(false);
    setStep("details");
    setPortfolioCondition(analysis.condition);
    setPurchasePrice("");
    setQuantity(1);
  }

  function proceedToIntent() {
    if (!priceValid) return;
    setStep("intent");
  }

  function confirmAdd() {
    if (!priceValid) return;
    const conditionAnalysis =
      analyzeSet(analysis.set.number, portfolioCondition) ?? analysis;
    const next = addToPortfolio({
      setNumber: analysis.set.number,
      name: analysis.set.name,
      theme: analysis.set.theme,
      condition: portfolioCondition,
      purchasePrice: parsedPrice,
      estimatedValue: conditionAnalysis.estimatedValue,
      suggestedListPrice: conditionAnalysis.recommendedListPrice,
      recommendation: conditionAnalysis.recommendation,
      quantity,
      intentTag,
      notes: notes.trim(),
    });
    saveGrowthSnapshot(next);
    setPortfolio(next);
    const count = getPortfolioItem(next, analysis.set.number)?.quantity ?? 0;
    setJustAdded(true);
    resetFlow();
    onAdded?.(count);
  }

  if (step === "intent") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-300">
          What is this copy for?
        </p>
        <IntentPicker value={intentTag} onChange={setIntentTag} />
        <div>
          <label
            htmlFor="copyNotes"
            className="mb-1.5 block text-sm font-medium text-zinc-400"
          >
            Notes (optional)
          </label>
          <textarea
            id="copyNotes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Flip after Q4 spike…"
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-base text-white placeholder:text-zinc-600 md:text-sm"
          />
        </div>
        {quantity > 1 && (
          <p className="text-xs text-zinc-500">
            Same intent and notes will apply to all {quantity} copies.
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={confirmAdd}
            className="touch-target w-full rounded-xl bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-[#fbbf24] sm:flex-1"
          >
            Add {quantity > 1 ? `${quantity} copies` : "copy"}
          </button>
          <button
            type="button"
            onClick={() => setStep("details")}
            className="touch-target w-full rounded-xl px-4 py-3 text-sm text-zinc-400 hover:text-white sm:w-auto"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="space-y-4">
        {copyCount > 0 && (
          <p className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-3 text-sm text-[#fbbf24]">
            You already own {copyCount}{" "}
            {copyCount === 1 ? "copy" : "copies"} —{" "}
            {formatIntentBreakdown(existing!.copies)}
          </p>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">
            Condition
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PORTFOLIO_CONDITIONS.map((c) => (
              <label
                key={c.value}
                className={`cursor-pointer rounded-xl border px-3 py-3 text-left transition ${
                  portfolioCondition === c.value
                    ? "border-[#f59e0b] bg-[#f59e0b]/10 ring-1 ring-[#f59e0b]/40"
                    : "border-zinc-700 bg-zinc-950 hover:border-zinc-600"
                }`}
              >
                <input
                  type="radio"
                  name="portfolioCondition"
                  value={c.value}
                  checked={portfolioCondition === c.value}
                  onChange={() => setPortfolioCondition(c.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium text-white">
                  {c.label}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {c.hint}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="portfolioPurchasePrice"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            {priceLabel}
          </label>
          <input
            id="portfolioPurchasePrice"
            type="number"
            min="0"
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-base text-white md:text-sm"
            autoFocus
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">
            Number of copies (same condition &amp; price)
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease copy count"
              className="touch-target flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-600 text-lg disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-xl font-bold text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              disabled={quantity >= 99}
              aria-label="Increase copy count"
              className="touch-target flex h-11 w-11 items-center justify-center rounded-xl border border-[#f59e0b]/50 text-lg text-[#f59e0b] disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={proceedToIntent}
            disabled={!priceValid}
            className="touch-target w-full rounded-xl bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-50 sm:flex-1"
          >
            Next — choose intent
          </button>
          <button
            type="button"
            onClick={resetFlow}
            className="touch-target w-full rounded-xl px-4 py-3 text-sm text-zinc-400 hover:text-white sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (copyCount > 0) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3 text-sm text-[#fbbf24]">
          You already own {copyCount}{" "}
          {copyCount === 1 ? "copy" : "copies"} of this set
          <span className="mt-1 block text-xs text-zinc-400">
            {formatIntentBreakdown(existing!.copies)}
          </span>
        </p>
        <button
          type="button"
          onClick={startAdd}
          className="touch-target w-full rounded-xl bg-[#f59e0b] px-5 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-[#fbbf24]"
        >
          Add Another Copy
        </button>
        <Link
          href="/portfolio"
          className="flex w-full items-center justify-center rounded-xl border border-zinc-600 py-3 text-sm font-semibold text-zinc-300 hover:border-[#f59e0b] hover:text-[#f59e0b]"
        >
          View in Portfolio →
        </Link>
        {justAdded && (
          <p className="text-center text-sm font-semibold text-emerald-400">
            ✓ Added to portfolio
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={startAdd}
        className="touch-target w-full rounded-xl border border-zinc-600 bg-zinc-900 py-3.5 text-sm font-semibold text-white hover:border-[#f59e0b] hover:text-[#f59e0b]"
      >
        Add to Portfolio
      </button>
      {justAdded && (
        <p className="text-center text-sm font-semibold text-emerald-400">
          ✓ Added to portfolio
        </p>
      )}
    </div>
  );
}
