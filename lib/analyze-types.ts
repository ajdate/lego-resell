export type Condition = "sealed" | "complete" | "incomplete";
/** Portfolio-only condition; valued at 60% of sealed */
export type PortfolioCondition = Condition | "damaged-box";

export const DAMAGED_BOX_VALUE_MULTIPLIER = 0.6;
export type Trend = "rising" | "stable" | "falling";
export type Recommendation = "SELL" | "HOLD";

export interface ConditionAnalysisOverride {
  estimatedValue: number;
  recommendedListPrice: number;
  recommendation: Recommendation;
  reasoning: string;
}

export interface LegoSet {
  number: string;
  name: string;
  theme: string;
  year: number;
  pieces: number;
  msrp: number;
  lastUpdated?: string;
  dataSource?: string;
  retired?: boolean;
  retiringSoon?: boolean;
  pricing: Record<Condition, { estimatedValue: number; trend: Trend }>;
  analysis?: Partial<Record<Condition, ConditionAnalysisOverride>>;
}

export interface Analysis {
  set: LegoSet;
  condition: PortfolioCondition;
  estimatedValue: number;
  recommendedListPrice: number;
  roiPercent: number;
  recommendation: Recommendation;
  reasoning: string;
}

export function isSetRetired(set: LegoSet | undefined): boolean {
  return set?.retired === true;
}

export function isSetRetiringSoon(set: LegoSet | undefined): boolean {
  return set?.retiringSoon === true && set?.retired !== true;
}

export function isCondition(value: string): value is Condition {
  return value === "sealed" || value === "complete" || value === "incomplete";
}

export function isPortfolioCondition(
  value: string,
): value is PortfolioCondition {
  return isCondition(value) || value === "damaged-box";
}
