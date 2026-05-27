import type { Condition } from "@/lib/analyze";

export function buildCompareHref(params: {
  setA?: string;
  setB?: string;
  condA?: Condition;
  condB?: Condition;
}): string {
  const search = new URLSearchParams();
  if (params.setA) search.set("setA", params.setA);
  if (params.setB) search.set("setB", params.setB);
  if (params.condA) search.set("condA", params.condA);
  if (params.condB) search.set("condB", params.condB);
  const q = search.toString();
  return q ? `/compare?${q}` : "/compare";
}

export function parseCompareSearchParams(
  searchParams: URLSearchParams,
): {
  setA: string;
  setB: string;
  condA: Condition;
  condB: Condition;
} {
  const condA = searchParams.get("condA");
  const condB = searchParams.get("condB");
  return {
    setA: searchParams.get("setA")?.trim() ?? "",
    setB: searchParams.get("setB")?.trim() ?? "",
    condA:
      condA === "complete" || condA === "incomplete" ? condA : "sealed",
    condB:
      condB === "complete" || condB === "incomplete" ? condB : "sealed",
  };
}
