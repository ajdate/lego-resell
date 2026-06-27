import type { SimulationCondition } from "@/lib/investmentSimulator";

export function buildSimulatorHref(params: {
  setA?: string;
  setB?: string;
  condA?: SimulationCondition;
  condB?: SimulationCondition;
  amount?: number;
  invested?: number;
  startYear?: number;
  single?: boolean;
  copiesA?: number;
  copiesB?: number;
}): string {
  const search = new URLSearchParams();
  if (params.setA) search.set("setA", params.setA);
  if (params.setB) search.set("setB", params.setB);
  if (params.condA) search.set("condA", params.condA);
  if (params.condB) search.set("condB", params.condB);
  if (params.amount != null && params.amount > 0) {
    search.set("amount", String(Math.round(params.amount)));
  }
  if (params.invested != null && params.invested > 0) {
    search.set("invested", String(Math.round(params.invested)));
  }
  if (params.startYear) search.set("startYear", String(params.startYear));
  if (params.single === true) search.set("single", "true");
  else if (params.single === false) search.set("single", "false");
  if (params.copiesA != null && params.copiesA > 0) {
    search.set("copiesA", String(Math.round(params.copiesA)));
  }
  if (params.copiesB != null && params.copiesB > 0) {
    search.set("copiesB", String(Math.round(params.copiesB)));
  }
  const q = search.toString();
  return q ? `/simulator?${q}` : "/simulator";
}

export function parseSimulatorSearchParams(searchParams: URLSearchParams): {
  setA: string;
  setB: string;
  condA: SimulationCondition;
  condB: SimulationCondition;
  amount: number;
  invested: number;
  startYear: number;
  single: boolean;
  copiesA: number;
  copiesB: number;
} {
  const condA = searchParams.get("condA");
  const condB = searchParams.get("condB");
  const amount = parseInt(searchParams.get("amount") ?? "1000", 10);
  const invested = parseInt(searchParams.get("invested") ?? "0", 10);
  const startYear = parseInt(searchParams.get("startYear") ?? "2018", 10);
  const copiesA = parseInt(searchParams.get("copiesA") ?? "1", 10);
  const copiesB = parseInt(searchParams.get("copiesB") ?? "1", 10);
  const singleParam = searchParams.get("single");
  const single =
    singleParam === "true"
      ? true
      : singleParam === "false"
        ? false
        : !searchParams.get("setB");
  return {
    setA: searchParams.get("setA")?.trim() ?? "",
    setB: searchParams.get("setB")?.trim() ?? "",
    condA: condA === "complete" ? "complete" : "sealed",
    condB: condB === "complete" ? "complete" : "sealed",
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1000,
    invested: Number.isFinite(invested) && invested > 0 ? invested : 0,
    startYear: Number.isFinite(startYear) ? startYear : 2018,
    single,
    copiesA: Number.isFinite(copiesA) ? Math.min(10, Math.max(1, copiesA)) : 1,
    copiesB: Number.isFinite(copiesB) ? Math.min(10, Math.max(1, copiesB)) : 1,
  };
}
