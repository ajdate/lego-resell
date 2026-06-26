import type { Recommendation } from "@/lib/analyze-types";

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
  if (trimmed.length < 4) {
    return "Set numbers are usually 4-6 digits — please check and try again";
  }
  if (trimmed.length > 6) {
    return "That doesn't look like a valid set number — LEGO set numbers are 4-6 digits";
  }
  return null;
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

  if (isDigitOnlyQuery(trimmed)) {
    return { ok: true, setNumber: trimmed };
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
