export type Urgency = "High" | "Medium" | "Low";

export interface SellNowItem {
  setNumber: string;
  name: string;
  urgency: Urgency;
  reason: string;
  suggestedPrice: number;
  potentialProfit: number;
}

export interface HoldItem {
  setNumber: string;
  name: string;
  holdUntil: string;
  reason: string;
  projectedValue: number;
}

export interface WatchListItem {
  insight: string;
  action: string;
}

export interface PortfolioHealthDetail {
  score: number;
  label: string;
  strengths: string[];
  weaknesses: string[];
}

export interface PortfolioRecommendations {
  portfolioScore: number;
  scoreSummary: string;
  sellNow: SellNowItem[];
  hold: HoldItem[];
  watchList: WatchListItem[];
  portfolioHealth: PortfolioHealthDetail;
}

export function parseRecommendationsResponse(
  text: string,
): PortfolioRecommendations | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, trimmed];
  let jsonStr = (jsonMatch[1] ?? trimmed).trim();

  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr) as PortfolioRecommendations;
    if (
      typeof parsed.portfolioScore === "number" &&
      typeof parsed.scoreSummary === "string" &&
      Array.isArray(parsed.sellNow) &&
      Array.isArray(parsed.hold) &&
      Array.isArray(parsed.watchList) &&
      parsed.portfolioHealth &&
      typeof parsed.portfolioHealth.score === "number" &&
      Array.isArray(parsed.portfolioHealth.strengths) &&
      Array.isArray(parsed.portfolioHealth.weaknesses)
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function formatSellRecommendationsForClipboard(
  items: SellNowItem[],
): string {
  return items
    .map(
      (item) =>
        `#${item.setNumber} ${item.name}\nUrgency: ${item.urgency}\nList at: $${item.suggestedPrice} AUD\nEst. profit: $${item.potentialProfit} AUD\n${item.reason}`,
    )
    .join("\n\n---\n\n");
}

export function urgencyStyles(urgency: Urgency) {
  switch (urgency) {
    case "High":
      return "bg-red-500/20 text-red-400 border-red-800/50";
    case "Medium":
      return "bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40";
    case "Low":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-800/50";
  }
}
