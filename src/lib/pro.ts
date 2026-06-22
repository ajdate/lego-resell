import { supabaseClient } from "./supabase-client";

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

export async function checkIsPro(userId: string): Promise<boolean> {
  if (!userId) return false;

  // During beta everyone is pro
  return true;

  // Uncomment when ready to charge:
  // const { data } = await supabaseClient
  //   .from("user_preferences")
  //   .select("is_pro")
  //   .eq("user_id", userId)
  //   .single();
  // return data?.is_pro || false;
}

export function isPro(): boolean {
  return true; // Beta - everyone gets Pro free
}

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
