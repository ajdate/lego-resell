import { analyzeSet, getAllSets, type LegoSet, type Recommendation } from "@/lib/analyze";

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

export function toSearchResult(set: LegoSet): SetSearchResult | null {
  const analysis = analyzeSet(set.number, "sealed");
  if (!analysis) return null;

  return {
    number: set.number,
    name: set.name,
    theme: set.theme,
    year: set.year,
    pieces: set.pieces,
    msrp: set.msrp,
    retired: set.retired === true,
    retiringSoon: set.retiringSoon === true && set.retired !== true,
    estimatedValue: analysis.estimatedValue,
    recommendedListPrice: analysis.recommendedListPrice,
    recommendation: analysis.recommendation,
  };
}

export function searchSets(query: string, limit = 10): SetSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches = getAllSets().filter((set) => {
    const num = set.number.toLowerCase();
    const name = set.name.toLowerCase();
    const theme = set.theme.toLowerCase();
    return (
      num.startsWith(q) ||
      num.includes(q) ||
      name.includes(q) ||
      theme.includes(q)
    );
  });

  return matches
    .map(toSearchResult)
    .filter((r): r is SetSearchResult => r !== null)
    .slice(0, limit);
}

export function getSetsByTheme(theme: string): SetSearchResult[] {
  const normalized = theme.trim();
  return getAllSets()
    .filter((s) => s.theme === normalized)
    .map(toSearchResult)
    .filter((r): r is SetSearchResult => r !== null);
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

  const results = searchSets(trimmed, 10);
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
  return { ok: false, error: "No matching sets found — try a different name or number" };
}

export function getThemeCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { theme } of BROWSE_CATEGORIES) {
    counts[theme] = getAllSets().filter((s) => s.theme === theme).length;
  }
  return counts;
}
