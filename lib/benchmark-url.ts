import type { SimulationCondition } from "@/lib/investmentSimulator";

export function buildBenchmarkHref(params: {
  set?: string;
  condition?: SimulationCondition;
  invested?: number;
  from?: number;
}): string {
  const search = new URLSearchParams();
  if (params.set) search.set("set", params.set);
  if (params.condition) search.set("condition", params.condition);
  if (params.invested && params.invested > 0) search.set("invested", String(Math.round(params.invested)));
  if (params.from) search.set("from", String(params.from));
  const q = search.toString();
  return q ? `/benchmark?${q}` : "/benchmark";
}

export function parseBenchmarkSearchParams(searchParams: URLSearchParams): {
  set: string;
  condition: SimulationCondition;
  invested: number;
  from: number;
} {
  const condition = searchParams.get("condition");
  const invested = parseInt(searchParams.get("invested") ?? "1000", 10);
  const from = parseInt(searchParams.get("from") ?? "2020", 10);
  return {
    set: searchParams.get("set")?.trim() ?? "",
    condition: condition === "complete" ? "complete" : "sealed",
    invested: Number.isFinite(invested) && invested > 0 ? invested : 1000,
    from: Number.isFinite(from) ? from : 2020,
  };
}

