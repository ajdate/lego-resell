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
}

export function isPro(): boolean {
  // Beta: everyone gets Pro free
  // When ready to charge: replace with Stripe subscription check
  return true
}

export function requiresPro(feature: keyof typeof PRO_FEATURES): boolean {
  return PRO_FEATURES[feature]
}

export function getProFeatureList(): string[] {
  return [
    'Portfolio Tracker & Analytics',
    'AI Listing Generator',
    'Profit Calculator',
    'Investment Simulator',
    'Benchmark Comparison',
    'Risk vs Reward Chart',
    'Price Targets',
    'Set Comparison Tool',
    'Alerts & Watchlist',
    'Investment Battles',
    'Portfolio Fit Analysis',
    'Recommendation History',
  ]
}
