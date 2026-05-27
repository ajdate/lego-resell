import type { SimulationCondition } from "@/lib/investmentSimulator";

export function buildSimulatorHref(params: {
  setA?: string;
  setB?: string;
  condA?: SimulationCondition;
  condB?: SimulationCondition;
  amount?: number;
  startYear?: number;
}): string {
  const search = new URLSearchParams();
  if (params.setA) search.set("setA", params.setA);
  if (params.setB) search.set("setB", params.setB);
  if (params.condA) search.set("condA", params.condA);
  if (params.condB) search.set("condB", params.condB);
  if (params.amount != null && params.amount > 0) {
    search.set("amount", String(Math.round(params.amount)));
  }
  if (params.startYear) search.set("startYear", String(params.startYear));
  const q = search.toString();
  return q ? `/simulator?${q}` : "/simulator";
}

export function parseSimulatorSearchParams(searchParams: URLSearchParams): {
  setA: string;
  setB: string;
  condA: SimulationCondition;
  condB: SimulationCondition;
  amount: number;
  startYear: number;
} {
  const condA = searchParams.get("condA");
  const condB = searchParams.get("condB");
  const amount = parseInt(searchParams.get("amount") ?? "1000", 10);
  const startYear = parseInt(searchParams.get("startYear") ?? "2018", 10);
  return {
    setA: searchParams.get("setA")?.trim() ?? "",
    setB: searchParams.get("setB")?.trim() ?? "",
    condA: condA === "complete" ? "complete" : "sealed",
    condB: condB === "complete" ? "complete" : "sealed",
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1000,
    startYear: Number.isFinite(startYear) ? startYear : 2018,
  };
}
