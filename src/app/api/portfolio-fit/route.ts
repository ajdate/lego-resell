import { NextRequest, NextResponse } from "next/server";
import type { Condition } from "@/lib/analyze-types";
import { findSet } from "@/lib/analyze.server";
import {
  analysePortfolioFitFromCatalogue,
  comparePortfolioFitFromCatalogue,
} from "@/lib/portfolioFit.server";
import type { PortfolioItem } from "@/lib/portfolio";
import { SETS_DATA_CACHE_HEADERS } from "@/src/lib/api-cache";

export async function POST(request: NextRequest) {
  let body: {
    portfolio?: PortfolioItem[];
    single?: {
      setNumber: string;
      condition: Condition;
      price: number;
    };
    compare?: {
      setA: string;
      condA: Condition;
      priceA: number;
      setB: string;
      condB: Condition;
      priceB: number;
    };
    lookup?: { setNumber: string };
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.lookup?.setNumber) {
    const set = findSet(body.lookup.setNumber);
    return NextResponse.json(
      { set: set ? { number: set.number, name: set.name, theme: set.theme } : null },
      { headers: SETS_DATA_CACHE_HEADERS },
    );
  }

  const portfolio = body.portfolio ?? [];

  if (body.compare) {
    const result = comparePortfolioFitFromCatalogue(
      body.compare.setA,
      body.compare.condA,
      body.compare.priceA,
      body.compare.setB,
      body.compare.condB,
      body.compare.priceB,
      portfolio,
    );
    if (!result) {
      return NextResponse.json(
        { error: "One or both sets not found in catalogue." },
        { status: 404 },
      );
    }
    return NextResponse.json({ compareResult: result }, { headers: SETS_DATA_CACHE_HEADERS });
  }

  if (body.single) {
    const result = analysePortfolioFitFromCatalogue(
      body.single.setNumber,
      body.single.condition,
      body.single.price,
      portfolio,
    );
    if (!result) {
      return NextResponse.json(
        { error: "Set not found in catalogue." },
        { status: 404 },
      );
    }
    return NextResponse.json({ singleResult: result }, { headers: SETS_DATA_CACHE_HEADERS });
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
