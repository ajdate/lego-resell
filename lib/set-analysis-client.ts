import type {
  Analysis,
  Condition,
  LegoSet,
  PortfolioCondition,
} from "@/lib/analyze-types";

const analysisCache = new Map<string, Analysis>();

function cacheKey(setNumber: string, condition: string): string {
  return `${setNumber.trim()}:${condition}`;
}

export async function fetchSetAnalysis(
  setNumber: string,
  condition: Condition | PortfolioCondition,
): Promise<Analysis | null> {
  const key = cacheKey(setNumber, condition);
  const cached = analysisCache.get(key);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      set: setNumber.trim(),
      condition,
    });
    const res = await fetch(`/api/sets?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { analysis?: Analysis };
    if (!data.analysis) return null;
    analysisCache.set(key, data.analysis);
    return data.analysis;
  } catch {
    return null;
  }
}

export async function fetchSetMeta(
  setNumber: string,
): Promise<LegoSet | undefined> {
  const analysis = await fetchSetAnalysis(setNumber, "sealed");
  return analysis?.set;
}

export function primeSetAnalysisCache(
  setNumber: string,
  condition: Condition | PortfolioCondition,
  analysis: Analysis,
): void {
  analysisCache.set(cacheKey(setNumber, condition), analysis);
}
