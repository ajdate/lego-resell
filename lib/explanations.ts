import type { Condition, Recommendation } from "@/lib/analyze";
import type { SetData } from "@/lib/confidence";

export type ScarcityRating = "Very Rare" | "Rare" | "Uncommon" | "Common";
export type DemandRating = "Very High" | "High" | "Moderate" | "Low";
export type LiquidityRating = "High" | "Medium" | "Low";
export type RiskRating = "Low Risk" | "Medium Risk" | "High Risk";
export type FactorImpact = "positive" | "negative" | "neutral";

export interface ExplanationSetData extends SetData {
  year?: number;
  name?: string;
}

export interface Factor {
  category: string;
  icon: string;
  title: string;
  explanation: string;
  impact: FactorImpact;
  weight: number;
}

export interface ExplanationResult {
  summary: string;
  factors: Factor[];
  marketContext: string;
  timingAdvice: string;
  scarcityRating: ScarcityRating;
  demandRating: DemandRating;
  liquidityRating: LiquidityRating;
  riskRating: RiskRating;
}

const CATEGORY_ORDER = [
  "Scarcity",
  "Demand",
  "Condition",
  "Size",
  "Value",
  "Timing",
] as const;

function isUcsTheme(theme: string): boolean {
  return theme === "Star Wars UCS" || theme === "UCS Star Wars";
}

function isRetired(set: ExplanationSetData): boolean {
  return set.retired === true;
}

function isRetiringSoon(set: ExplanationSetData): boolean {
  return set.retiringSoon === true && set.retired !== true;
}

function isActive(set: ExplanationSetData): boolean {
  return !isRetired(set) && !isRetiringSoon(set);
}

export function getScarcityRating(set: ExplanationSetData): ScarcityRating {
  const year = set.year ?? 2020;
  if (isRetired(set) && year < 2015) return "Very Rare";
  if (isRetired(set) && year >= 2015 && year <= 2019) return "Rare";
  if (isRetired(set) && year >= 2020) return "Uncommon";
  if (isRetiringSoon(set)) return "Uncommon";
  return "Common";
}

export function getDemandRating(
  set: ExplanationSetData,
  condition: string,
): DemandRating {
  const { theme, estimatedValue } = set;
  const retired = isRetired(set);
  const ucs = isUcsTheme(theme);

  if (condition === "incomplete" || estimatedValue < 80) return "Low";
  if ((ucs || theme === "Modular") && retired) return "Very High";
  if (
    (theme.includes("Ideas") || theme === "Creator Expert") &&
    retired
  ) {
    return "High";
  }
  if (ucs && !retired) return "High";
  if (
    theme === "Technic" ||
    theme === "Architecture" ||
    isActive(set)
  ) {
    return "Moderate";
  }
  return "Moderate";
}

export function getLiquidityRating(
  set: ExplanationSetData,
  condition: string,
): LiquidityRating {
  if (condition === "incomplete" || set.estimatedValue > 500) return "Low";
  if (set.estimatedValue < 200 && set.recommendation === "SELL") return "High";
  if (set.estimatedValue >= 200 && set.estimatedValue <= 500) return "Medium";
  return "Medium";
}

export function getRiskRating(
  set: ExplanationSetData,
  condition: string,
  confidenceScore: number,
): RiskRating {
  if (
    (isActive(set) && set.recommendation === "SELL") ||
    condition === "incomplete" ||
    confidenceScore < 50
  ) {
    return "High Risk";
  }
  if (isRetiringSoon(set) || condition === "complete") return "Medium Risk";
  if (isRetired(set) && confidenceScore >= 65 && condition === "sealed") {
    return "Low Risk";
  }
  if (isRetired(set) && condition === "sealed" && confidenceScore >= 50) {
    return "Medium Risk";
  }
  return "Medium Risk";
}

const BADGE_EMERALD =
  "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25";
const BADGE_GREEN = "bg-green-500/15 text-green-400 ring-1 ring-green-500/25";
const BADGE_AMBER = "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25";
const BADGE_RED = "bg-red-500/15 text-red-400 ring-1 ring-red-500/25";

/** Badge colors per spec tier (kind disambiguates shared labels like "High") */
export function ratingBadgeClassName(
  kind: "scarcity" | "demand" | "liquidity" | "risk",
  rating: string,
): string {
  if (kind === "scarcity") {
    if (rating === "Very Rare") return BADGE_EMERALD;
    if (rating === "Rare") return BADGE_GREEN;
    if (rating === "Uncommon") return BADGE_AMBER;
    return BADGE_RED;
  }
  if (kind === "demand") {
    if (rating === "Very High") return BADGE_EMERALD;
    if (rating === "High") return BADGE_GREEN;
    if (rating === "Moderate") return BADGE_AMBER;
    return BADGE_RED;
  }
  if (kind === "liquidity") {
    if (rating === "High") return BADGE_EMERALD;
    if (rating === "Medium") return BADGE_AMBER;
    return BADGE_RED;
  }
  if (rating === "Low Risk") return BADGE_EMERALD;
  if (rating === "Medium Risk") return BADGE_AMBER;
  return BADGE_RED;
}

export function getRatingTooltip(
  kind: "scarcity" | "demand" | "liquidity" | "risk",
  rating: string,
): string {
  const tips: Record<string, Record<string, string>> = {
    scarcity: {
      "Very Rare": "Vintage retired set — sealed examples are exceptionally scarce.",
      Rare: "Retired 2015–2019 — supply tightening as stock sells through.",
      Uncommon: "Recently retired or retiring soon — scarcity building.",
      Common: "Still in production — retail availability limits resale premiums.",
    },
    demand: {
      "Very High": "Top-tier collector theme with strong global buyer demand.",
      High: "Strong collector following and active secondary market.",
      Moderate: "Steady demand from enthusiasts; niche but reliable.",
      Low: "Limited buyer interest at this condition or price point.",
    },
    liquidity: {
      High: "Easier to sell quickly at current price — good exit liquidity.",
      Medium: "Typical selling timeline; motivated buyers available.",
      Low: "Smaller buyer pool or higher price — may take longer to sell.",
    },
    risk: {
      "Low Risk": "Favourable hold/sell profile — retired, sealed, high confidence.",
      "Medium Risk": "Some timing or condition factors — monitor the market.",
      "High Risk": "Selling early, incomplete, or low confidence increases risk.",
    },
  };
  return tips[kind][rating] ?? rating;
}

function generateFactors(
  set: ExplanationSetData,
  condition: string,
): Factor[] {
  const factors: Factor[] = [];
  const year = set.year ?? 2020;
  const { theme, pieces, estimatedValue, recommendation } = set;
  const retired = isRetired(set);
  const retiringSoon = isRetiringSoon(set);
  const active = isActive(set);
  const normalizedCondition = condition as Condition;

  if (retired) {
    factors.push({
      category: "Scarcity",
      icon: "🔴",
      title: "Production Discontinued",
      explanation:
        "This set is no longer manufactured by LEGO. As existing stock sells through, scarcity increases and prices typically rise. Retired sets are the backbone of the LEGO secondary market.",
      impact: "positive",
      weight: 30,
    });
  }

  if (retiringSoon) {
    factors.push({
      category: "Scarcity",
      icon: "⚠️",
      title: "Approaching Retirement",
      explanation:
        "This set is expected to retire within 6–12 months. Historically, LEGO sets begin appreciating 3–6 months before retirement as collectors buy ahead of the cutoff.",
      impact: "positive",
      weight: 20,
    });
  }

  if (year < 2015 && retired) {
    factors.push({
      category: "Scarcity",
      icon: "💎",
      title: "Vintage Collectible",
      explanation:
        "Sets retired before 2015 are considered vintage. A decade of natural attrition means sealed examples are exceptionally rare. Vintage sets command the highest long-term premiums.",
      impact: "positive",
      weight: 15,
    });
  }

  if (active) {
    factors.push({
      category: "Scarcity",
      icon: "🟢",
      title: "Currently In Production",
      explanation:
        "This set is still available at retail. Secondary market pricing is constrained by retail availability. Resale opportunity improves significantly after retirement.",
      impact: "negative",
      weight: -15,
    });
  }

  if (isUcsTheme(theme)) {
    factors.push({
      category: "Demand",
      icon: "⭐",
      title: "Ultimate Collector Series",
      explanation:
        "UCS sets are the most actively traded LEGO sets globally. Designed for adult display, they command persistent demand from Star Wars fans, LEGO collectors and investors alike. UCS sets rarely lose value long-term.",
      impact: "positive",
      weight: 15,
    });
  }

  if (theme === "Modular") {
    factors.push({
      category: "Demand",
      icon: "🏛️",
      title: "Modular Collector Market",
      explanation:
        "Modular buildings have the most consistent appreciation record of any LEGO theme. City builders actively seek retired Modulars to complete their displays. Early Modulars from 2007–2012 have appreciated over 500%.",
      impact: "positive",
      weight: 15,
    });
  }

  if (theme.includes("Ideas")) {
    factors.push({
      category: "Demand",
      icon: "💡",
      title: "Ideas Fan Community",
      explanation:
        "LEGO Ideas sets are voted into production by fans, creating a passionate and loyal collector base. Licensed Ideas sets are particularly valuable as IP constraints prevent reissues.",
      impact: "positive",
      weight: 10,
    });
  }

  if (theme === "Creator Expert") {
    factors.push({
      category: "Demand",
      icon: "🚗",
      title: "Creator Expert Appeal",
      explanation:
        "Creator Expert sets attract adult collectors, vehicle enthusiasts and display builders. Licensed vehicle sets (Ferrari, VW, Aston Martin) benefit from dual audiences of car and LEGO fans.",
      impact: "positive",
      weight: 10,
    });
  }

  if (theme === "Technic") {
    factors.push({
      category: "Demand",
      icon: "⚙️",
      title: "Technic Enthusiast Market",
      explanation:
        "Premium Technic sets, especially branded collaborations (Porsche, Lamborghini, Bugatti), attract automotive enthusiasts alongside LEGO collectors. Demand is strong but more niche.",
      impact: "positive",
      weight: 8,
    });
  }

  if (normalizedCondition === "sealed") {
    factors.push({
      category: "Condition",
      icon: "✦",
      title: "Factory Sealed Premium",
      explanation:
        "Sealed sets command a 25–40% premium over complete used examples. Many serious collectors will only purchase sealed sets, creating a separate and more valuable market tier.",
      impact: "positive",
      weight: 10,
    });
  }

  if (normalizedCondition === "complete") {
    factors.push({
      category: "Condition",
      icon: "◆",
      title: "Complete Used",
      explanation:
        "Complete sets with all pieces, instructions and original box retain strong value. The discount vs sealed is typically 20–30%. Buyers are more flexible on condition for rarer sets.",
      impact: "neutral",
      weight: -5,
    });
  }

  if (normalizedCondition === "incomplete") {
    factors.push({
      category: "Condition",
      icon: "✕",
      title: "Incomplete — Significant Discount",
      explanation:
        "Incomplete sets sell at a steep discount — typically 40–60% below complete used prices. Many collectors will not purchase incomplete sets. Consider completing the set before listing if possible.",
      impact: "negative",
      weight: -20,
    });
  }

  if (pieces > 4000) {
    factors.push({
      category: "Size",
      icon: "🏆",
      title: "Flagship Set",
      explanation:
        "Sets exceeding 4,000 pieces are considered LEGO flagships. They command premium prices, attract serious collectors, and are typically produced in lower volumes. Flagship status drives long-term value.",
      impact: "positive",
      weight: 10,
    });
  } else if (pieces > 2000) {
    factors.push({
      category: "Size",
      icon: "📦",
      title: "Large Set Premium",
      explanation:
        "Sets over 2,000 pieces occupy the premium end of the market. They represent significant builds with strong display value, appealing to collectors who prioritise impressive pieces.",
      impact: "positive",
      weight: 5,
    });
  }

  if (estimatedValue > 500) {
    factors.push({
      category: "Value",
      icon: "💰",
      title: "High Value Asset",
      explanation:
        "Sets valued over $500 attract serious collectors and investors rather than casual buyers. The buyer pool is smaller but more motivated, and these sets hold value exceptionally well.",
      impact: "positive",
      weight: 10,
    });
  }

  if (estimatedValue < 100) {
    factors.push({
      category: "Value",
      icon: "⬇️",
      title: "Limited Resale Margin",
      explanation:
        "Lower value sets offer limited profit margin after platform fees (eBay ~13%, Facebook Marketplace time cost). Consider whether the effort of listing is worthwhile at this price point.",
      impact: "negative",
      weight: -10,
    });
  }

  if (recommendation === "SELL" && retired) {
    factors.push({
      category: "Timing",
      icon: "📈",
      title: "Strong Current Market",
      explanation:
        "Current secondary market conditions support premium pricing for this set. Collector demand is active and supply is tightening. This is considered a strong exit window.",
      impact: "positive",
      weight: 20,
    });
  }

  if (recommendation === "HOLD" && retiringSoon) {
    factors.push({
      category: "Timing",
      icon: "⏳",
      title: "Pre-Retirement Hold Window",
      explanation:
        "The optimal strategy for retiring sets is to hold through retirement and into the post-retirement appreciation phase. Selling now would leave significant upside on the table.",
      impact: "positive",
      weight: 20,
    });
  }

  if (recommendation === "SELL" && !retired) {
    factors.push({
      category: "Timing",
      icon: "⚠️",
      title: "Selling Before Retirement",
      explanation:
        "Selling an active set before retirement typically means leaving money on the table. Unless you need immediate liquidity, holding through retirement usually yields significantly better returns.",
      impact: "negative",
      weight: -15,
    });
  }

  return factors.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(
      a.category as (typeof CATEGORY_ORDER)[number],
    );
    const bi = CATEGORY_ORDER.indexOf(
      b.category as (typeof CATEGORY_ORDER)[number],
    );
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function getMarketContext(theme: string): string {
  if (isUcsTheme(theme)) {
    return "UCS Star Wars sets are among the most actively traded LEGO sets globally. Collector demand is driven by nostalgia, display value, and the strength of the Star Wars IP. Premium examples continue to attract competitive bidding on major marketplaces.";
  }
  if (theme === "Modular") {
    return "Modular buildings have one of the strongest and most consistent resale records in the LEGO secondary market. City collectors actively seek retired Modulars to complete their displays, supporting steady price appreciation.";
  }
  if (theme.includes("Ideas")) {
    return "LEGO Ideas sets benefit from a passionate fan community built through the voting process. Licensed Ideas sets are particularly sought after as IP agreements can prevent reissues, limiting future supply.";
  }
  if (theme === "Creator Expert") {
    return "Creator Expert sets appeal to adult collectors and vehicle enthusiasts. Retired vehicles and seasonal sets command strong premiums as display pieces with broad crossover appeal.";
  }
  if (theme === "Technic") {
    return "Premium Technic sets, especially branded vehicle collaborations, attract both LEGO collectors and automotive enthusiasts. The market is active but more specialised than mainstream themes.";
  }
  if (theme === "Architecture") {
    return "Architecture sets appeal to design-conscious collectors and skyline enthusiasts. Demand is steady with strong performance for iconic landmarks and retired skylines.";
  }
  return "The LEGO secondary market continues to grow as adult collectors recognise the investment potential of retired sets. Timing around retirement remains the single biggest driver of long-term appreciation.";
}

export function getTimingAdvice(
  recommendation: Recommendation,
  set: ExplanationSetData,
  condition: string,
): string {
  const retired = isRetired(set);
  const retiringSoon = isRetiringSoon(set);
  const active = isActive(set);
  const year = set.year ?? 2020;

  if (condition === "incomplete") {
    return "Allow extra time to sell — incomplete listings often need 4–8 weeks to find the right buyer. If you can complete the set first, revisit pricing against BrickLink sold data for complete used copies.";
  }

  if (recommendation === "SELL" && retired && year < 2015) {
    return "List within the next 30–60 days. Vintage sets have a patient but motivated buyer pool — price confidently and allow 2–4 weeks for the right buyer to find your listing.";
  }

  if (recommendation === "SELL" && retired && year >= 2015 && year <= 2020) {
    return "Current market conditions support a premium listing. Price at or slightly above the suggested list price and monitor for 2–3 weeks. If no interest, adjust by 5–8% and reassess.";
  }

  if (recommendation === "SELL" && retired && year > 2020) {
    return "This set retired recently — buyer demand is typically strongest in the first 1–2 years post-retirement. List now to capture peak early-retirement pricing.";
  }

  if (recommendation === "HOLD" && retiringSoon) {
    return "Do not sell before retirement. The post-retirement appreciation window typically begins within 3–6 months of a set leaving production. Your patience here has measurable dollar value.";
  }

  if (recommendation === "HOLD" && active) {
    return "Watch for retirement announcements via LEGO's official channels and BrickLink retirement trackers. The retirement date is your primary signal to reassess.";
  }

  if (recommendation === "HOLD" && retired) {
    return "This set is in an appreciation phase. Reassess in 12 months or when estimated value increases by 20%+ — whichever comes first.";
  }

  if (recommendation === "SELL" && active) {
    return "If you must sell now, price competitively against current retail and accept that post-retirement appreciation is unlikely to be captured. Reassess only if you need immediate liquidity.";
  }

  return "Review BrickLink and eBay sold listings for the past 30 days before listing, and adjust price within 5–8% if there is no meaningful interest after 2–3 weeks.";
}

function buildSummary(
  set: ExplanationSetData,
  condition: string,
): string {
  const name = set.name?.trim() || "This set";
  const retired = isRetired(set);
  const retiringSoon = isRetiringSoon(set);
  const active = isActive(set);
  const ucs = isUcsTheme(set.theme);
  const modular = set.theme === "Modular";
  const ideas = set.theme.includes("Ideas");
  const creatorExpert = set.theme === "Creator Expert";
  const year = set.year ?? 2020;
  const rec = set.recommendation;

  if (condition === "incomplete") {
    return `Note: incomplete condition significantly impacts both price and buyer pool for the ${name}. Many serious collectors will not purchase incomplete sets. If possible, sourcing missing pieces before listing will meaningfully improve your sale price and time-to-sell. Factor platform fees into your net return calculation.`;
  }

  if (retired && ucs && rec === "SELL") {
    return `The ${name} is a retired Ultimate Collector Series set with strong and consistent secondary market demand. UCS sets benefit from the enduring strength of the Star Wars IP and a global collector base. Current prices reflect active buyer interest — this is a well-supported exit window.`;
  }

  if (retired && ucs && rec === "HOLD") {
    return `While the ${name} is retired, UCS values for this set are still in an appreciation phase. The Star Wars collector market rewards patience — selling now would likely leave significant upside unrealised. Monitor BrickLink sold listings over the next 6–12 months before committing to a sale.`;
  }

  if (retiringSoon && rec === "HOLD") {
    return `The ${name} is approaching retirement — one of the most reliable value catalysts in the LEGO secondary market. Historical data shows sets typically begin appreciating 3–6 months before retirement and continue rising for 12–24 months post-retirement. Holding through this window is the recommended strategy.`;
  }

  if (retired && modular && rec === "SELL") {
    return `Modular buildings have the most consistent appreciation record of any LEGO theme. The ${name} is retired and sits in a well-established collector market where city builders actively seek complete displays. Current secondary market conditions support a premium listing price.`;
  }

  if (retired && modular && rec === "HOLD") {
    return `The ${name} is retired but still in an early appreciation phase. Modular values tend to compound over time — the longer you hold, the stronger the return. Unless you need immediate liquidity, patience is likely to be rewarded here.`;
  }

  if (retired && creatorExpert && rec === "SELL") {
    return `The ${name} is a retired Creator Expert set with broad collector and enthusiast appeal. Licensed vehicle sets in this line benefit from dual audiences — LEGO collectors and brand fans. The secondary market for this set is active and current prices are well supported.`;
  }

  if (retired && ideas && rec === "SELL") {
    return `As a retired LEGO Ideas set, the ${name} benefits from a passionate and loyal fan community. Ideas sets are voted into production, creating an emotional connection that sustains collector demand long after retirement. Current prices reflect healthy market interest.`;
  }

  if (retiringSoon && ucs) {
    return `The ${name} is expected to retire within the next 6–12 months. For UCS sets, retirement is a significant value event — global collector demand typically surges as retail stock depletes. Acquiring sealed examples now and holding through retirement is a proven strategy for this category.`;
  }

  if (active && rec === "SELL") {
    return `The ${name} is currently in production and available at retail, which limits secondary market pricing. Selling now means competing directly with LEGO's retail price. Unless you acquired this set at a significant discount, holding through retirement will almost certainly yield a better return.`;
  }

  if (active && rec === "HOLD") {
    return `The ${name} is still in production. While secondary market demand exists, the most significant value uplift typically occurs after retirement. Holding now and monitoring LEGO's retirement announcements is the recommended approach for this set.`;
  }

  if (retired && year < 2015 && rec === "SELL") {
    return `The ${name} is a vintage retired set — now over a decade since production ended. A decade of natural attrition means sealed examples are increasingly scarce. You are selling into a market where supply is structurally declining and collector interest remains strong. This is a well-timed exit.`;
  }

  if (rec === "SELL") {
    return `Based on current market data, the ${name} shows positive resale conditions. Collector demand is active and the secondary market is supporting premium pricing. Review recent BrickLink and eBay sold listings to confirm pricing before listing.`;
  }

  return `Based on current market conditions, holding the ${name} is the recommended strategy. The set has not yet reached its optimal exit window. Monitor retirement announcements and secondary market price trends over the coming months.`;
}

export function generateExplanation(
  set: ExplanationSetData,
  condition: string,
  confidenceScore: number,
): ExplanationResult {
  const scarcityRating = getScarcityRating(set);
  const demandRating = getDemandRating(set, condition);
  const liquidityRating = getLiquidityRating(set, condition);
  const riskRating = getRiskRating(set, condition, confidenceScore);
  const factors = generateFactors(set, condition);

  return {
    summary: buildSummary(set, condition),
    factors,
    marketContext: getMarketContext(set.theme),
    timingAdvice: getTimingAdvice(set.recommendation, set, condition),
    scarcityRating,
    demandRating,
    liquidityRating,
    riskRating,
  };
}

export function explanationSetFromLegoSet(
  set: {
    name?: string;
    theme: string;
    pieces: number;
    year?: number;
    retired?: boolean;
    retiringSoon?: boolean;
  },
  recommendation: Recommendation,
  estimatedValue: number,
): ExplanationSetData {
  return {
    name: set.name,
    theme: set.theme,
    pieces: set.pieces,
    year: set.year,
    retired: set.retired,
    retiringSoon: set.retiringSoon,
    recommendation,
    estimatedValue,
  };
}

export function groupFactorsByCategory(
  factors: Factor[],
): { category: string; factors: Factor[] }[] {
  const map = new Map<string, Factor[]>();
  for (const f of factors) {
    const list = map.get(f.category) ?? [];
    list.push(f);
    map.set(f.category, list);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((category) => ({
    category,
    factors: map.get(category)!,
  }));
}
