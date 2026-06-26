import "server-only";

import type { Condition } from "@/lib/analyze-types";
import { analyzeSet } from "@/lib/analyze.server";
import type { PortfolioItem } from "@/lib/portfolio";
import {
  analysePortfolioFit,
  comparePortfolioFit,
  portfolioFitSetFromAnalysis,
  type PortfolioFitResult,
} from "@/lib/portfolioFit";

export function analysePortfolioFitFromCatalogue(
  setNumber: string,
  condition: Condition,
  purchasePrice: number,
  portfolio: PortfolioItem[],
): PortfolioFitResult | null {
  const analysis = analyzeSet(setNumber, condition);
  if (!analysis) return null;
  const effectivePrice =
    purchasePrice > 0 ? purchasePrice : analysis.estimatedValue;
  return analysePortfolioFit(
    portfolioFitSetFromAnalysis(analysis),
    condition,
    effectivePrice,
    portfolio,
  );
}

export function comparePortfolioFitFromCatalogue(
  setA: string,
  condA: Condition,
  priceA: number,
  setB: string,
  condB: Condition,
  priceB: number,
  portfolio: PortfolioItem[],
) {
  const analysisA = analyzeSet(setA, condA);
  const analysisB = analyzeSet(setB, condB);
  if (!analysisA || !analysisB) return null;

  return comparePortfolioFit(
    portfolioFitSetFromAnalysis(analysisA),
    condA,
    priceA > 0 ? priceA : analysisA.estimatedValue,
    portfolioFitSetFromAnalysis(analysisB),
    condB,
    priceB > 0 ? priceB : analysisB.estimatedValue,
    portfolio,
  );
}
