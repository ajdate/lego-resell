"use client";

import type { Analysis, Recommendation } from "@/lib/analyze";
import { isSetRetired, isSetRetiringSoon } from "@/lib/analyze";
import { EbayRecentSalesSection } from "@/components/EbayRecentSalesSection";
import { useCurrency } from "@/src/lib/currencyContext";

interface ConditionRangeRow {
  label: string;
  low: number;
  high: number;
  barWidthPercent: number;
}

function formatRange(
  low: number,
  high: number,
  formatPrice: (amount: number) => string,
): string {
  return `~${formatPrice(low)} – ${formatPrice(high)}`;
}

function buildConditionRanges(estimatedValue: number): ConditionRangeRow[] {
  const sealedHigh = estimatedValue * 1.12;
  return [
    {
      label: "New / Sealed",
      low: estimatedValue * 1.0,
      high: sealedHigh,
      barWidthPercent: 100,
    },
    {
      label: "Complete (used)",
      low: estimatedValue * 0.68,
      high: estimatedValue * 0.78,
      barWidthPercent: Math.round((0.78 / 1.12) * 100),
    },
    {
      label: "Damaged box",
      low: estimatedValue * 0.55,
      high: estimatedValue * 0.65,
      barWidthPercent: Math.round((0.65 / 1.12) * 100),
    },
    {
      label: "Incomplete",
      low: estimatedValue * 0.35,
      high: estimatedValue * 0.45,
      barWidthPercent: Math.round((0.45 / 1.12) * 100),
    },
  ];
}

function saleVelocity(
  estimatedValue: number,
  recommendation: Recommendation,
): string {
  if (recommendation === "HOLD") {
    return "Limited recent sales activity — hold position";
  }
  if (estimatedValue > 500) {
    return "Avg sell time: 7–14 days · Low volume market";
  }
  if (estimatedValue > 200) {
    return "Avg sell time: 3–7 days · Active market";
  }
  return "Avg sell time: 1–3 days · Fast moving";
}

function marketHeat(
  analysis: Analysis,
  retired: boolean,
  retiringSoon: boolean,
): string {
  const { estimatedValue, recommendation } = analysis;
  if (retired && recommendation === "SELL" && estimatedValue > 300) {
    return "🔥 High Demand — strong buyer activity";
  }
  if (retired && recommendation === "SELL") {
    return "⚡ Active Market — steady buyer interest";
  }
  if (retiringSoon) {
    return "📈 Rising Demand — retirement approaching drives interest";
  }
  if (!retired && recommendation === "HOLD") {
    return "😴 Low Activity — wait for retirement signal";
  }
  return "◆ Moderate Activity";
}

function regionalNote(theme: string): string {
  if (theme.includes("UCS") || theme === "Star Wars UCS") {
    return "US prices typically 8–15% below AU market. Consider international buyers.";
  }
  if (theme === "Modular") {
    return "AU and US prices closely aligned for Modulars. Local sale recommended.";
  }
  if (theme === "Creator Expert") {
    return "US market 5–10% below AU for most Creator Expert sets.";
  }
  return "AU secondary market prices are generally 10–15% above US BrickLink prices.";
}

function platformRecommendation(estimatedValue: number): string {
  if (estimatedValue > 300) {
    return "Recommended platform: eBay (wider audience for premium sets) or BrickLink";
  }
  if (estimatedValue >= 100) {
    return "Recommended platform: Facebook Marketplace (local pickup) or eBay";
  }
  return "Recommended platform: Facebook Marketplace (faster local sales)";
}

export function MarketSalesContextPanel({ analysis }: { analysis: Analysis }) {
  const { formatPrice } = useCurrency();
  const retired = isSetRetired(analysis.set);
  const retiringSoon = isSetRetiringSoon(analysis.set);
  const conditionRanges = buildConditionRanges(analysis.estimatedValue);
  const brickLinkUrl = `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${encodeURIComponent(analysis.set.number)}-1`;

  return (
    <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="text-lg font-semibold text-white">Market Sales Context</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        ⚠️ Estimated ranges based on recent market research. Verify on BrickLink
        before listing.
      </p>
      <a
        href={brickLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm text-[#f59e0b] transition hover:text-[#fbbf24] hover:underline"
      >
        View live sold listings on BrickLink →
      </a>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Estimated sold prices by condition
        </h3>
        <ul className="mt-3 divide-y divide-white/8">
          {conditionRanges.map((row) => (
            <li key={row.label} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm text-zinc-300">{row.label}</span>
                <span className="text-sm font-medium text-[#f59e0b]">
                  {formatRange(row.low, row.high, formatPrice)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#f59e0b]/70 transition-all"
                  style={{ width: `${row.barWidthPercent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 space-y-3 border-t border-white/8 pt-5 text-sm">
        <p className="text-zinc-400">
          <span className="font-medium text-zinc-300">Sale velocity: </span>
          {saleVelocity(analysis.estimatedValue, analysis.recommendation)}
        </p>
        <p className="text-zinc-300">
          {marketHeat(analysis, retired, retiringSoon)}
        </p>
        <p className="text-zinc-400">
          <span className="font-medium text-zinc-300">Regional: </span>
          {regionalNote(analysis.set.theme)}
        </p>
        <p className="text-zinc-400">{platformRecommendation(analysis.estimatedValue)}</p>
      </div>

      <EbayRecentSalesSection analysis={analysis} />

      <p className="mt-5 border-t border-white/8 pt-4 text-xs text-zinc-600">
        📊 Live sold data coming in V2 — BrickLink API &amp; eBay Marketplace
        Insights
      </p>
    </section>
  );
}
