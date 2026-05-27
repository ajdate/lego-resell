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

type CompareSetPickerProps = {
  label: string;
  setNumber: string;
  setName: string | null;
  condition: Condition;
  onSetNumberChange: (number: string) => void;
  onSetResolved: (number: string, name: string) => void;
  onConditionChange: (condition: Condition) => void;
  onClear: () => void;
  inputId: string;
};

export function CompareSetPicker({
  label,
  setNumber,
  setName,
  condition,
  onSetNumberChange,
  onSetResolved,
  onConditionChange,
  onClear,
  inputId,
}: CompareSetPickerProps) {
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

  async function resolveFromQuery() {
    const trimmed = query.trim();
    if (!trimmed) {
      onClear();
      return;
    }
    const result = await resolveSearchQuery(query);
    if (result.ok) {
      onSetNumberChange(result.setNumber);
      const match = suggestions.find((s) => s.number === result.setNumber);
      onSetResolved(result.setNumber, match?.name ?? `Set ${result.setNumber}`);
      setQuery(result.setNumber);
      setOpen(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        void resolveFromQuery();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
        {label}
      </p>
      <div ref={containerRef} className="relative mt-3">
        <label htmlFor={inputId} className="sr-only">
          {label} set search
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSetNumberChange(e.target.value);
            if (!e.target.value.trim()) onClear();
          }}
          onBlur={() => {
            window.setTimeout(() => void resolveFromQuery(), 150);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder="Set number or name"
          className="touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none transition focus:border-[#f59e0b]/50 focus:ring-1 focus:ring-[#f59e0b]/30"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-3.5 text-xs text-zinc-500">
            …
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
            role="listbox"
          >
            {suggestions.map((item, index) => (
              <li key={item.number} role="option">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(item)}
                  className={`flex w-full min-h-[44px] items-center gap-2 px-4 py-2.5 text-left text-sm transition ${
                    index === highlightIndex
                      ? "bg-white/10"
                      : "hover:bg-white/5"
                  }`}
                >
                  <span className="font-mono font-bold text-[#f59e0b]">
                    {item.number}
                  </span>
                  <span className="truncate text-white">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {setName && setNumber && (
        <p className="mt-2 text-sm font-medium text-zinc-300">{setName}</p>
      )}
      <fieldset className="mt-4">
        <legend className="mb-2 text-xs text-zinc-500">Condition</legend>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <label
              key={c.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition ${
                condition === c.value
                  ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#fbbf24]"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <input
                type="radio"
                name={`${inputId}-condition`}
                value={c.value}
                checked={condition === c.value}
                onChange={() => onConditionChange(c.value)}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
