import type { Recommendation } from "@/lib/analyze-types";
import { isSetNumberQuery, storedSetNumber } from "@/lib/set-number";

export interface SetSearchResult {
  number: string;
  name: string;
  theme: string;
  year: number;
  pieces: number;
  msrp: number;
  retired: boolean;
  retiringSoon: boolean;
  estimatedValue: number;
  recommendedListPrice: number;
  recommendation: Recommendation;
  /** false when the value is only an estimate, not based on real sales */
  priceVerified?: boolean;
}

export const BROWSE_CATEGORIES: { label: string; theme: string }[] = [
  { label: "UCS Star Wars", theme: "Star Wars UCS" },
  { label: "Modular", theme: "Modular" },
  { label: "Creator Expert", theme: "Creator Expert" },
  { label: "Icons", theme: "Icons" },
  { label: "Technic", theme: "Technic" },
  { label: "Ideas", theme: "Ideas" },
  { label: "Architecture", theme: "Architecture" },
];

export function isDigitOnlyQuery(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function validateDigitQuery(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Enter a LEGO set number or name (e.g. 10262 or Falcon).";
  }
  if (!isDigitOnlyQuery(trimmed)) return null;
  // Vintage sets have 1-3 digit numbers (e.g. 112), so only reject very long ones
  if (trimmed.length > 7) {
    return "That doesn't look like a valid set number — LEGO set numbers are up to 7 digits";
  }
  return null;
}

/**
 * A number can belong to several sets (112 = 1977 building set, 112-2 = 1966
 * locomotive). One match: go straight there. Several: let the user pick.
 */
async function resolveSetNumberQuery(
  query: string,
): Promise<
  | { ok: true; setNumber: string }
  | { ok: false; error: string; suggestions?: SetSearchResult[] }
> {
  const base = storedSetNumber(query);
  const hasSuffix = /-\d+$/.test(base);
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
    const data = (await res.json()) as { results?: SetSearchResult[] };
    const exact = (data.results ?? []).filter(
      (r) => r.number === base || (!hasSuffix && r.number.startsWith(`${base}-`)),
    );
    if (exact.length > 1) {
      return {
        ok: false,
        error: `More than one set uses number ${base} — pick the one you mean`,
        suggestions: exact.slice(0, 6),
      };
    }
    if (exact.length === 1) return { ok: true, setNumber: exact[0].number };
  } catch {
    // Fall through: the results page handles sets we don't have
  }
  return { ok: true, setNumber: base };
}

export async function resolveSearchQuery(
  query: string,
): Promise<
  | { ok: true; setNumber: string }
  | { ok: false; error: string; suggestions?: SetSearchResult[] }
> {
  const trimmed = query.trim();
  const digitError = validateDigitQuery(trimmed);
  if (digitError) {
    return { ok: false, error: digitError };
  }

  if (isSetNumberQuery(trimmed)) {
    return resolveSetNumberQuery(trimmed);
  }

  try {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(trimmed)}&limit=10`,
    );
    const data = (await res.json()) as { results?: SetSearchResult[] };
    const results = data.results ?? [];

    if (results.length === 1) {
      return { ok: true, setNumber: results[0].number };
    }
    if (results.length > 1) {
      return {
        ok: false,
        error: "Select a set from the suggestions below",
        suggestions: results.slice(0, 6),
      };
    }
  } catch {
    return {
      ok: false,
      error: "Search is temporarily unavailable — try again",
    };
  }

  return {
    ok: false,
    error: "No matching sets found — try a different name or number",
  };
}

export async function fetchThemeCounts(): Promise<Record<string, number>> {
  try {
    const res = await fetch("/api/catalog/theme-counts");
    if (!res.ok) return {};
    const data = (await res.json()) as { counts?: Record<string, number> };
    return data.counts ?? {};
  } catch {
    return {};
  }
}
