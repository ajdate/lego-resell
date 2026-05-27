"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Condition } from "@/lib/analyze";
import { resolveSearchQuery, type SetSearchResult } from "@/lib/search";

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "sealed", label: "Sealed" },
  { value: "complete", label: "Complete" },
  { value: "incomplete", label: "Incomplete" },
];

type PortfolioFitSetPickerProps = {
  label: string;
  setNumber: string;
  setName: string | null;
  condition: Condition;
  purchasePrice: string;
  onSetNumberChange: (number: string) => void;
  onSetResolved: (number: string, name: string) => void;
  onConditionChange: (condition: Condition) => void;
  onPurchasePriceChange: (price: string) => void;
  inputId: string;
  showPrice?: boolean;
};

export function PortfolioFitSetPicker({
  label,
  setNumber,
  setName,
  condition,
  purchasePrice,
  onSetNumberChange,
  onSetResolved,
  onConditionChange,
  onPurchasePriceChange,
  inputId,
  showPrice = true,
}: PortfolioFitSetPickerProps) {
  const [query, setQuery] = useState(setNumber);
  const [suggestions, setSuggestions] = useState<SetSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(setNumber);
  }, [setNumber]);

  const fetchSuggestions = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      const results = (data.results ?? []) as SetSearchResult[];
      setSuggestions(results.slice(0, 6));
      setOpen(results.length > 0);
      setHighlightIndex(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSuggestions(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectSuggestion(item: SetSearchResult) {
    setQuery(item.number);
    onSetNumberChange(item.number);
    onSetResolved(item.number, item.name);
    setOpen(false);
    setSuggestions([]);
  }

  async function handleBlurResolve() {
    const trimmed = query.trim();
    if (!trimmed) return;
    const result = await resolveSearchQuery(trimmed);
    if (result.ok) {
      const match = suggestions.find((s) => s.number === result.setNumber);
      onSetNumberChange(result.setNumber);
      onSetResolved(
        result.setNumber,
        match?.name ?? `Set ${result.setNumber}`,
      );
      setQuery(result.setNumber);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleBlurResolve();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(
        (i) => (i - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
        {label}
      </p>
      <div ref={containerRef} className="relative">
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSetNumberChange(e.target.value);
          }}
          onBlur={() => void handleBlurResolve()}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search set name or number…"
          className="touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none transition focus:border-[#f59e0b]/60"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            …
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
            {suggestions.map((item, i) => (
              <li key={item.number}>
                <button
                  type="button"
                  className={`flex w-full flex-col px-4 py-2.5 text-left text-sm transition hover:bg-zinc-800 ${
                    i === highlightIndex ? "bg-zinc-800" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(item)}
                >
                  <span className="font-mono text-xs text-[#f59e0b]">
                    {item.number}
                  </span>
                  <span className="text-white">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {setName && (
        <p className="truncate text-xs text-zinc-500">{setName}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {CONDITIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onConditionChange(c.value)}
            className={`touch-target rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              condition === c.value
                ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#fbbf24]"
                : "border-white/10 text-zinc-400 hover:border-white/20"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {showPrice && (
        <div>
          <label
            htmlFor={`${inputId}-price`}
            className="mb-1.5 block text-xs font-medium text-zinc-500"
          >
            What would you pay? ($ AUD)
          </label>
          <input
            id={`${inputId}-price`}
            type="number"
            min={0}
            step={1}
            value={purchasePrice}
            onChange={(e) => onPurchasePriceChange(e.target.value)}
            placeholder="300"
            className="touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none focus:border-[#f59e0b]/60"
          />
        </div>
      )}
    </div>
  );
}
