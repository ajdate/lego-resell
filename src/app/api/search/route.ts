import { NextRequest, NextResponse } from "next/server";
import { getSetsByTheme, searchSets } from "@/lib/search";
import { SETS_DATA_CACHE_HEADERS } from "@/src/lib/api-cache";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const theme = searchParams.get("theme");

  if (theme) {
    const results = getSetsByTheme(theme);
    return NextResponse.json(
      { results, theme },
      { headers: SETS_DATA_CACHE_HEADERS },
    );
  }

  if (!q || !q.trim()) {
    return NextResponse.json(
      { error: "Provide ?q=searchterm or ?theme=ThemeName" },
      { status: 400 },
    );
  }

  const results = searchSets(q.trim(), 10);
  return NextResponse.json(
    { results, query: q.trim() },
    { headers: SETS_DATA_CACHE_HEADERS },
  );
}
