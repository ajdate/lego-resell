import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSet,
  isCondition,
  type Analysis,
} from "@/lib/analyze.server";
import { toSearchResult } from "@/lib/search.server";
import {
  filterCatalogSets,
  toCatalogListItem,
} from "@/src/lib/sets-catalog-server";

const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const setNumber = searchParams.get("set");
  const conditionParam = searchParams.get("condition");
  const similarTo = searchParams.get("similarTo");
  const sampleParam = searchParams.get("sample");
  const enrich = searchParams.get("enrich") === "true";

  if (sampleParam && !setNumber) {
    const count = Math.min(
      10,
      Math.max(1, parseInt(sampleParam, 10) || 3),
    );
    const shuffled = [...filterCatalogSets({})].sort(() => Math.random() - 0.5);
    const sample = shuffled
      .slice(0, count)
      .map((s) => {
        const a = analyzeSet(s.number, "sealed");
        return a
          ? {
              number: s.number,
              name: s.name,
              theme: s.theme,
              estimatedValue: a.estimatedValue,
              recommendation: a.recommendation,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ sample }, { headers: LIST_CACHE_HEADERS });
  }

  if (similarTo) {
    const current = analyzeSet(similarTo.trim(), "sealed");
    if (!current) {
      return NextResponse.json({ error: "Set not found." }, { status: 404 });
    }

    const similar = filterCatalogSets({ theme: current.set.theme })
      .filter((s) => s.number !== current.set.number)
      .map((s) => {
        const a = analyzeSet(s.number, "sealed");
        return a
          ? {
              number: s.number,
              name: s.name,
              estimatedValue: a.estimatedValue,
              recommendation: a.recommendation,
            }
          : null;
      })
      .filter(
        (item): item is NonNullable<typeof item> =>
          item !== null &&
          item.recommendation === current.recommendation,
      )
      .slice(0, 3);

    return NextResponse.json({ similar }, { headers: LIST_CACHE_HEADERS });
  }

  if (setNumber && conditionParam) {
    if (!isCondition(conditionParam)) {
      return NextResponse.json(
        { error: "Invalid condition. Use sealed, complete, or incomplete." },
        { status: 400 },
      );
    }

    const analysis: Analysis | null = analyzeSet(setNumber, conditionParam);
    if (!analysis) {
      return NextResponse.json(
        { error: `Set ${setNumber.trim()} not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { analysis },
      { headers: LIST_CACHE_HEADERS },
    );
  }

  const q = searchParams.get("q") || "";
  const theme = searchParams.get("theme") || "";
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
  );
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const filtered = filterCatalogSets({ q, theme });
  const total = filtered.length;
  const slice = filtered.slice((page - 1) * limit, page * limit);

  const data = enrich
    ? slice
        .map((set) => toSearchResult(set))
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : slice.map(toCatalogListItem);

  return NextResponse.json(
    {
      data,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    },
    { headers: LIST_CACHE_HEADERS },
  );
}
