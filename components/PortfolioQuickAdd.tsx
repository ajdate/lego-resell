"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioCondition } from "@/lib/analyze-types";
import { fetchSetAnalysis } from "@/lib/set-analysis-client";
import { addToPortfolio, type PortfolioItem } from "@/lib/portfolio";
import { PORTFOLIO_CONDITIONS } from "@/lib/portfolio-intent";
import type { SetSearchResult } from "@/lib/search";
import { CURRENCY_LABELS, useCurrency } from "@/src/lib/currencyContext";
import { convertCurrencyToAud } from "@/src/lib/currency";

const VINTAGE_AGE_YEARS = 20; // same rule as isVintageSet in lib/price-confidence

/**
 * Add sets without leaving the Portfolio page: search, condition, quantity,
 * optional price paid, Add. Stays ready for the next set.
 */
export function PortfolioQuickAdd({
  onAdded,
}: {
  onAdded: (next: PortfolioItem[]) => void | Promise<void>;
}) {
  const { currency } = useCurrency();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SetSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SetSearchResult | null>(null);
  const [condition, setCondition] = useState<PortfolioCondition>("sealed");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Suggestions as you type (skipped while a chosen set is showing)
  useEffect(() => {
    const q = query.trim();
    if (!q || selected) return;
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => r.json())
        .then((data: { results?: SetSearchResult[] }) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, selected]);

  function choose(set: SetSearchResult) {
    setSelected(set);
    setQuery(`${set.number} · ${set.name}`);
    setResults([]);
    setOpen(false);
    setMessage(null);
    // Older sets are mostly traded used
    if (set.year > 0 && set.year <= new Date().getFullYear() - VINTAGE_AGE_YEARS) {
      setCondition("complete");
    }
  }

  async function add() {
    // Enter on a typed number picks it if it's the only exact match
    let set = selected;
    if (!set) {
      const exact = results.filter((r) => r.number === query.trim());
      if (exact.length === 1) set = exact[0];
    }
    if (!set) {
      setMessage({ text: "Pick a set from the list first", error: true });
      return;
    }
    const paid = price.trim() === "" ? 0 : parseFloat(price);
    if (Number.isNaN(paid) || paid < 0) {
      setMessage({ text: "Price paid should be a number (or leave it blank)", error: true });
      return;
    }

    setAdding(true);
    try {
      const analysis = await fetchSetAnalysis(set.number, condition);
      const next = addToPortfolio({
        setNumber: set.number,
        name: set.name,
        theme: set.theme,
        pieces: analysis?.set.pieces ?? set.pieces,
        retired: analysis?.set.retired ?? set.retired,
        retiringSoon: analysis?.set.retiringSoon ?? set.retiringSoon,
        condition,
        purchasePrice: convertCurrencyToAud(paid, currency),
        estimatedValue: analysis?.estimatedValue ?? set.estimatedValue,
        suggestedListPrice: analysis?.recommendedListPrice ?? set.recommendedListPrice,
        recommendation: analysis?.recommendation ?? set.recommendation,
        quantity,
      });
      await onAdded(next);
      setMessage({ text: `Added ${quantity} × ${set.name}` });
      setSelected(null);
      setQuery("");
      setResults([]);
      setQuantity(1);
      setPrice("");
      inputRef.current?.focus();
    } catch {
      setMessage({ text: "Couldn't add that set — please try again", error: true });
    } finally {
      setAdding(false);
    }
  }

  const field =
    "rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30";

  return (
    <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
      <h2 className="text-sm font-bold text-white">Add a set</h2>
      <div className="relative mt-3">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setMessage(null);
            if (!e.target.value.trim()) setResults([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
            if (e.key === "Escape") setOpen(false);
          }}
          onFocus={() => results.length > 0 && !selected && setOpen(true)}
          placeholder="Set number or name, e.g. 75192 or Falcon"
          className={`${field} w-full placeholder:text-zinc-500`}
          aria-label="Search for a set to add"
          autoComplete="off"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 shadow-xl">
            {results.map((r) => (
              <li key={r.number}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  <span className="shrink-0 font-mono text-xs text-amber-400">{r.number}</span>
                  <span className="truncate text-white">{r.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-zinc-500">{r.year}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Condition
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as PortfolioCondition)}
            className={field}
          >
            {PORTFOLIO_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1 text-xs text-zinc-400">
          Quantity
          <div className="flex items-center rounded-xl border border-white/10 bg-[#0a0a0a]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2.5 text-white"
              aria-label="Fewer"
            >
              −
            </button>
            <span className="w-6 text-center text-sm text-white">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="px-3 py-2.5 text-white"
              aria-label="More"
            >
              +
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Paid each ({CURRENCY_LABELS[currency]}, optional)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
            className={`${field} w-32`}
          />
        </label>

        <button
          type="button"
          onClick={() => void add()}
          disabled={adding}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-400 disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {message && (
        <p className={`mt-2 text-xs ${message.error ? "text-red-400" : "text-emerald-400"}`}>
          {message.error ? "" : "✓ "}
          {message.text}
        </p>
      )}
    </section>
  );
}
