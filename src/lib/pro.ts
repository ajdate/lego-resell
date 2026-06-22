import { supabaseClient } from "./supabase-client";

export async function checkIsPro(
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data } = await supabaseClient
      .from("user_preferences")
      .select("is_pro")
      .eq("user_id", userId)
      .single();

    return data?.is_pro === true;
  } catch {
    return false;
  }
}

// Synchronous version - defaults to false unless we know they're pro
// Use checkIsPro() for accurate server-side checks
export function isPro(): boolean {
  return false; // Default to false - use checkIsPro() with userId for real check
}

export const PRO_FEATURES = {
  portfolioTracking: true,
  aiListingGenerator: true,
  profitCalculator: true,
  investmentSimulator: true,
  benchmarkComparison: true,
  riskRewardChart: true,
  priceTargets: true,
  portfolioAnalytics: true,
  recommendationHistory: true,
  portfolioFit: true,
  compareTools: true,
  alerts: true,
  watchlist: true,
  battles: true,
};

export function requiresPro(feature: keyof typeof PRO_FEATURES): boolean {
  return PRO_FEATURES[feature];
}

export function getProFeatureList(): string[] {
  return [
    "Portfolio Tracker & Analytics",
    "AI Listing Generator",
    "Profit Calculator",
    "Investment Simulator",
    "Benchmark Comparison",
    "Risk vs Reward Chart",
    "Price Targets",
    "Set Comparison Tool",
    "Alerts & Watchlist",
    "Investment Battles",
    "Portfolio Fit Analysis",
    "Recommendation History",
  ];
}
