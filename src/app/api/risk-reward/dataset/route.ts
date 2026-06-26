import { NextRequest, NextResponse } from "next/server";
import { getAllSets } from "@/lib/analyze.server";
import { buildRiskRewardDataset } from "@/lib/riskReward.server";
import type { PortfolioItem } from "@/lib/portfolio";
import { SETS_DATA_CACHE_HEADERS } from "@/src/lib/api-cache";

export async function POST(request: NextRequest) {
  let body: {
    portfolio?: PortfolioItem[];
    watchlistNumbers?: string[];
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const portfolio = body.portfolio ?? [];
  const watchlistNumbers = new Set(body.watchlistNumbers ?? []);

  const dataset = buildRiskRewardDataset({
    setNumbers: getAllSets().map((s) => s.number),
    condition: "sealed",
    portfolio,
    watchlistNumbers,
  });

  return NextResponse.json(
    { dataset },
    { headers: SETS_DATA_CACHE_HEADERS },
  );
}
