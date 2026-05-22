"use client";

import { useRouter } from "next/navigation";
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import type { Condition } from "@/lib/analyze";
import { resolveSearchQuery, type SetSearchResult } from "@/lib/search";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface SetSearchInputProps {
  query: string;
  onQueryChange: (value: string) => void;
  condition: Condition;
  onError: (message: string) => void;
  onClearError: () => void;
}

export function SetSearchInput({
  query,
  onQueryChange,
  condition,
  onError,
  onClearError,
}: SetSearchInputProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SetSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      fetchSuggestions(query);
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

  function navigateToSet(setNumber: string) {
    setOpen(false);
    onClearError();
    router.push(
      `/results?set=${encodeURIComponent(setNumber)}&condition=${condition}`,
    );
  }

  function selectSuggestion(item: SetSearchResult) {
    onQueryChange(item.number);
    navigateToSet(item.number);
  }

  async function runSearchSubmit() {
    const result = await resolveSearchQuery(query);
    if (result.ok) {
      onClearError();
      navigateToSet(result.setNumber);
      return;
    }
    onError(result.error);
    if (result.suggestions) {
      setSuggestions(result.suggestions);
      setOpen(true);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        void runSearchSubmit();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) =>
        i < suggestions.length - 1 ? i + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) =>
        i > 0 ? i - 1 : suggestions.length - 1,
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === "Enter" && highlightIndex < 0) {
      e.preventDefault();
      void runSearchSubmit();
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor="setSearch"
        className="mb-2 block text-sm font-medium text-zinc-300"
      >
        Set number or name
      </label>
      <input
        id="setSearch"
        name="setSearch"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          onClearError();
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="e.g. 10262 or Falcon"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="set-search-listbox"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:border-[#f2cd00] focus:outline-none focus:ring-2 focus:ring-[#f2cd00]/30 md:text-sm"
      />

      {open && suggestions.length > 0 && (
        <ul
          id="set-search-listbox"
          role="listbox"
          className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-white/10 bg-[#141414] py-1 shadow-xl"
        >
          {suggestions.map((item, index) => (
            <li
              key={item.number}
              role="option"
              aria-selected={index === highlightIndex}
            >
              <button
                type="button"
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectSuggestion(item)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  index === highlightIndex
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#f59e0b]">
                      {item.number}
                    </span>
                    <span className="truncate text-sm text-white">
                      {item.name}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {item.theme}
                    </span>
                    {item.retired && (
                      <span className="rounded-md bg-red-950/80 px-2 py-0.5 text-xs font-semibold text-red-400">
                        RETIRED
                      </span>
                    )}
                    {item.retiringSoon && (
                      <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-xs font-semibold text-[#f59e0b]">
                        RETIRING SOON
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatUsd(item.estimatedValue)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && query.trim().length > 0 && (
        <p className="absolute right-0 top-full mt-1 text-xs text-zinc-500">
          Searching…
        </p>
      )}
    </div>
  );
}

export async function submitSearchFromQuery(
  query: string,
  condition: Condition,
  router: ReturnType<typeof useRouter>,
  onError: (msg: string) => void,
  onClearError: () => void,
  callbacks?: {
    setSuggestions: (items: SetSearchResult[]) => void;
    setOpen: (open: boolean) => void;
  },
) {
  const result = await resolveSearchQuery(query);
  if (result.ok) {
    onClearError();
    router.push(
      `/results?set=${encodeURIComponent(result.setNumber)}&condition=${condition}`,
    );
    return;
  }
  onError(result.error);
  if (result.suggestions && callbacks) {
    callbacks.setSuggestions(result.suggestions);
    callbacks.setOpen(true);
  }
}
