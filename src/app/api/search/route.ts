import { NextRequest, NextResponse } from "next/server";
import { getSetsByTheme, searchSets } from "@/lib/search.server";
import { SETS_DATA_CACHE_HEADERS } from "@/src/lib/api-cache";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const theme = searchParams.get("theme");
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
  );

  if (theme) {
    const results = getSetsByTheme(theme).slice(0, limit);
    return NextResponse.json(
      { results, theme, total: results.length },
      { headers: SETS_DATA_CACHE_HEADERS },
    );
  }

  if (!q || !q.trim()) {
    return NextResponse.json(
      { error: "Provide ?q=searchterm or ?theme=ThemeName" },
      { status: 400 },
    );
  }

  const results = searchSets(q.trim(), limit);
  return NextResponse.json(
    { results, query: q.trim(), total: results.length },
    { headers: SETS_DATA_CACHE_HEADERS },
  );
}
