import { NextResponse } from "next/server";
import { BROWSE_CATEGORIES } from "@/lib/search";
import { getThemeCountsFromIndex } from "@/src/lib/search-index.server";
import { SETS_DATA_CACHE_HEADERS } from "@/src/lib/api-cache";

export async function GET() {
  try {
    const themes = BROWSE_CATEGORIES.map((c) => c.theme);
    const counts = getThemeCountsFromIndex(themes);
    return NextResponse.json(
      { counts },
      { headers: SETS_DATA_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Theme counts GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
