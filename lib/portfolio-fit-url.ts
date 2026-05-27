import type { Condition } from "@/lib/analyze";

export function buildPortfolioFitHref(params: {
  set?: string;
  setA?: string;
  setB?: string;
  condition?: Condition;
  condA?: Condition;
  condB?: Condition;
  price?: number;
  priceA?: number;
  priceB?: number;
  compare?: boolean;
}): string {
  const search = new URLSearchParams();
  if (params.compare) search.set("compare", "1");
  if (params.setA) search.set("setA", params.setA);
  if (params.setB) search.set("setB", params.setB);
  if (params.set) search.set("set", params.set);
  if (params.condA) search.set("condA", params.condA);
  if (params.condB) search.set("condB", params.condB);
  if (params.condition) search.set("condition", params.condition);
  if (params.price != null && params.price > 0) {
    search.set("price", String(Math.round(params.price)));
  }
  if (params.priceA != null && params.priceA > 0) {
    search.set("priceA", String(Math.round(params.priceA)));
  }
  if (params.priceB != null && params.priceB > 0) {
    search.set("priceB", String(Math.round(params.priceB)));
  }
  const q = search.toString();
  return q ? `/portfolio-fit?${q}` : "/portfolio-fit";
}

export function parsePortfolioFitSearchParams(searchParams: URLSearchParams): {
  compare: boolean;
  set: string;
  setA: string;
  setB: string;
  condition: Condition;
  condA: Condition;
  condB: Condition;
  price: number;
  priceA: number;
  priceB: number;
} {
  const parseCond = (v: string | null): Condition => {
    if (v === "complete" || v === "incomplete") return v;
    return "sealed";
  };
  const price = parseInt(searchParams.get("price") ?? "", 10);
  const priceA = parseInt(searchParams.get("priceA") ?? "", 10);
  const priceB = parseInt(searchParams.get("priceB") ?? "", 10);
  return {
    compare: searchParams.get("compare") === "1",
    set: searchParams.get("set")?.trim() ?? "",
    setA: searchParams.get("setA")?.trim() ?? searchParams.get("set")?.trim() ?? "",
    setB: searchParams.get("setB")?.trim() ?? "",
    condition: parseCond(searchParams.get("condition")),
    condA: parseCond(searchParams.get("condA") ?? searchParams.get("condition")),
    condB: parseCond(searchParams.get("condB")),
    price: Number.isFinite(price) && price > 0 ? price : 0,
    priceA: Number.isFinite(priceA) && priceA > 0 ? priceA : 0,
    priceB: Number.isFinite(priceB) && priceB > 0 ? priceB : 0,
  };
}
