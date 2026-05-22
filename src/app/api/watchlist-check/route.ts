import { NextResponse } from "next/server";
import { analyzeSet, getAllSets, type Recommendation } from "@/lib/analyze";

export async function GET() {
  const recommendations: Record<string, Recommendation> = {};

  for (const set of getAllSets()) {
    const analysis = analyzeSet(set.number, "sealed");
    if (analysis) {
      recommendations[set.number] = analysis.recommendation;
    }
  }

  return NextResponse.json({ recommendations });
}
