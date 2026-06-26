import { NextRequest, NextResponse } from "next/server";
import { getAllMarketOpportunities } from "@/lib/market-opportunities.server";
import {
  getOpportunitiesSummary,
} from "@/lib/market-opportunities";
import { SETS_DATA_CACHE_HEADERS } from "@/src/lib/api-cache";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam
    ? Math.max(1, parseInt(limitParam, 10) || 0)
    : undefined;

  const entries = getAllMarketOpportunities();
  const results = limit ? entries.slice(0, limit) : entries;

  return NextResponse.json(
    {
      results,
      total: entries.length,
      summary: getOpportunitiesSummary(entries),
    },
    { headers: SETS_DATA_CACHE_HEADERS },
  );
}
