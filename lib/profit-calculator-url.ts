import type { CalculatorCondition } from "@/lib/profit-calculator";

export function buildProfitCalculatorHref(params: {
  set?: string;
  sellPrice?: number;
  buyPrice?: number;
  condition?: CalculatorCondition | string;
}): string {
  const search = new URLSearchParams();
  if (params.set) search.set("set", params.set);
  if (params.sellPrice != null && Number.isFinite(params.sellPrice)) {
    search.set("sellPrice", String(params.sellPrice));
  }
  if (params.buyPrice != null && Number.isFinite(params.buyPrice)) {
    search.set("buyPrice", String(params.buyPrice));
  }
  if (params.condition) search.set("condition", params.condition);
  const q = search.toString();
  return q ? `/profit-calculator?${q}` : "/profit-calculator";
}
