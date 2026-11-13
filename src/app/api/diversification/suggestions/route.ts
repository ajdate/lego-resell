import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSet,
  getAllSets,
  getRetiringSoonSets,
  type LegoSet,
} from "@/lib/analyze.server";
import {
  isUcsTheme,
  type SuggestedAddition,
  type SuggestionQuery,
} from "@/lib/diversification";
import {
  opportunitySetFromLego,
  scoreOpportunity,
} from "@/lib/opportunityScoring";

/** Highest opportunity-score set not already owned, within budget. */
function bestCandidate(
  candidates: LegoSet[],
  owned: Set<string>,
  maxValue: number,
  reason: string,
): SuggestedAddition | null {
  let best: SuggestedAddition | null = null;
  let bestScore = -Infinity;
  for (const set of candidates) {
    if (owned.has(set.number)) continue;
    const analysis = analyzeSet(set.number, "sealed");
    if (!analysis || analysis.estimatedValue > maxValue) continue;
    const score = scoreOpportunity(
      opportunitySetFromLego(set, analysis.recommendation, analysis.estimatedValue),
    ).opportunityScore;
    if (score > bestScore) {
      bestScore = score;
      best = {
        setNumber: set.number,
        name: set.name,
        theme: set.theme,
        estimatedValueUsd: analysis.estimatedValue,
        reason,
      };
    }
  }
  return best;
}

export async function POST(request: NextRequest) {
  try {
    const q = (await request.json()) as Partial<SuggestionQuery>;
    const owned = new Set(q.owned ?? []);
    const maxValue = Number(q.maxValue) || 200;
    const suggestions: SuggestedAddition[] = [];
    const add = (s: SuggestedAddition | null) => {
      if (!s) return;
      suggestions.push(s);
      owned.add(s.setNumber);
    };

    if (q.needModular) {
      add(bestCandidate(
        getAllSets().filter((s) => s.theme === "Modular"),
        owned,
        maxValue,
        "Adds Modular exposure — strong long-term collector demand",
      ));
    }
    if (q.needUcs) {
      add(bestCandidate(
        getAllSets().filter((s) => isUcsTheme(s.theme)),
        owned,
        maxValue,
        "Adds UCS premium demand and flagship appreciation potential",
      ));
    }
    if (q.needRetiringSoon) {
      add(bestCandidate(
        getRetiringSoonSets(),
        owned,
        maxValue,
        "Retiring soon — buy before retirement window closes",
      ));
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Diversification suggestions error:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
