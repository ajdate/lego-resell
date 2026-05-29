"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { SetImage } from "@/components/SetImage";
import { ValueChart } from "@/components/ValueChart";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { useCurrency } from "@/src/lib/currencyContext";
import { buySignalClassName } from "@/lib/opportunityScoring";
import { loadPortfolio } from "@/lib/portfolio";
import {
  buildPortfolioAnalytics,
  healthLabelColor,
  riskColorClass,
  type PortfolioAnalytics,
} from "@/lib/portfolio-analytics";

function sectionClass() {
  return "rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:p-6";
}

function SegmentBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-full bg-zinc-900">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={`${segment.color} flex items-center justify-center text-[10px] font-semibold text-zinc-900 sm:text-xs`}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label}: ${segment.value}`}
          >
            {segment.value > 0 && (segment.value / total) * 100 >= 12
              ? `${Math.round((segment.value / total) * 100)}%`
              : ""}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
        {segments.map((segment) => (
          <span key={segment.label}>
            {segment.label}: {segment.value} (
            {Math.round((segment.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function CompositionBar({
  title,
  segments,
}: {
  title: string;
  segments: { label: string; value: number; color: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <SegmentBar segments={segments} />
    </div>
  );
}

export default function PortfolioAnalyticsPage() {
  const { formatPrice, formatPriceSecondary } = useCurrency();
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const items = loadPortfolio();
    setAnalytics(buildPortfolioAnalytics(items));
    setLoaded(true);
  }, []);

  const sellHoldSegments = useMemo(() => {
    if (!analytics) return [];
    const total = analytics.metrics.sellCount + analytics.metrics.holdCount || 1;
    return [
      {
        label: "SELL",
        value: analytics.metrics.sellCount,
        color: "bg-emerald-500",
        pct: Math.round((analytics.metrics.sellCount / total) * 100),
      },
      {
        label: "HOLD",
        value: analytics.metrics.holdCount,
        color: "bg-amber-500",
        pct: Math.round((analytics.metrics.holdCount / total) * 100),
      },
    ];
  }, [analytics]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-500">
        Loading analytics…
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex min-h-full flex-col bg-[#0a0a0a]">
        <AppHeader title="Portfolio Analytics" subtitle="Deep insights" />
        <main className="page-main mx-auto max-w-4xl flex-1 px-4 py-16 text-center">
          <p className="text-zinc-400">Add sets to your portfolio to unlock analytics.</p>
          <Link
            href="/portfolio"
            className="mt-4 inline-block text-sm font-semibold text-[#f59e0b] hover:underline"
          >
            Go to Portfolio →
          </Link>
        </main>
      </div>
    );
  }

  const { metrics, growthSummary } = analytics;
  const gainPositive = metrics.totalProfit >= 0;
  const trackingChange = growthSummary?.totalGrowthDollars ?? metrics.totalProfit;
  const trackingPercent = growthSummary?.totalGrowthPercent ?? metrics.percentGain;

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader
        title="Portfolio Analytics"
        subtitle="Deep insights into your collection performance"
      />
      <main className="page-main mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/portfolio"
              className="text-sm text-zinc-500 transition hover:text-[#f59e0b]"
            >
              ← Portfolio
            </Link>
            <p className="mt-2 text-xs text-zinc-500">
              Last updated {analytics.lastUpdated}
            </p>
          </div>
          <CurrencyToggle />
        </div>

        {/* Hero metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={sectionClass()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Total Value
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {formatPrice(metrics.totalEstimated)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              ≈ {formatPriceSecondary(metrics.totalEstimated)}
            </p>
            <p
              className={`mt-2 text-sm font-medium ${trackingChange >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {trackingChange >= 0 ? "+" : ""}
              {formatPrice(trackingChange)} ({trackingPercent >= 0 ? "+" : ""}
              {trackingPercent}%) since tracking began
            </p>
          </div>

          <div className={sectionClass()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Total Return
            </p>
            <p
              className={`mt-2 text-3xl font-black ${gainPositive ? "text-emerald-400" : "text-red-400"}`}
            >
              {gainPositive ? "+" : ""}
              {formatPrice(metrics.totalProfit)}
            </p>
            <p className={`mt-1 text-sm font-semibold ${gainPositive ? "text-emerald-300" : "text-red-300"}`}>
              {metrics.percentGain >= 0 ? "+" : ""}
              {metrics.percentGain}% ROI
            </p>
          </div>

          <div className={sectionClass()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Health Score
            </p>
            <p className={`mt-2 text-3xl font-black ${healthLabelColor(metrics.healthLabel)}`}>
              {analytics.healthScore100}/100
            </p>
            <p className={`mt-1 text-sm font-semibold ${healthLabelColor(metrics.healthLabel)}`}>
              {metrics.healthLabel}
            </p>
          </div>

          <div className={sectionClass()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Potential Upside
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-400">
              +{formatPrice(analytics.potentialUpside)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              if all SELL sets listed today
            </p>
            <p className="mt-1 text-sm text-emerald-300">
              +{analytics.potentialUpsidePercent}% additional return available
            </p>
          </div>
        </div>

        {/* Recommendation breakdown */}
        <section className={`mt-8 ${sectionClass()}`}>
          <h2 className="text-lg font-bold text-white">Recommendation Breakdown</h2>
          <div className="mt-4 flex h-10 w-full overflow-hidden rounded-full">
            {sellHoldSegments.map((segment) => (
              <div
                key={segment.label}
                className={`${segment.color} flex items-center justify-center text-xs font-bold text-zinc-900`}
                style={{
                  width: `${((segment.value / (metrics.sellCount + metrics.holdCount || 1)) * 100).toFixed(1)}%`,
                }}
              >
                {segment.label} {segment.value} ({segment.pct}%)
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="font-semibold text-emerald-300">SELL</p>
              <p className="mt-1 text-sm text-zinc-300">
                {metrics.sellCount} sets · {formatPrice(analytics.sellValue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">List these now</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="font-semibold text-amber-300">HOLD</p>
              <p className="mt-1 text-sm text-zinc-300">
                {metrics.holdCount} sets · {formatPrice(analytics.holdValue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Hold for appreciation</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-semibold text-zinc-300">Mixed</p>
              <p className="mt-1 text-sm text-zinc-300">
                {analytics.mixedSetCount} sets with multiple copies
              </p>
              <p className="mt-1 text-xs text-zinc-500">Across both categories</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Sets you should list now</h3>
              <Link href="/portfolio" className="text-xs font-semibold text-[#f59e0b] hover:underline">
                View all →
              </Link>
            </div>
            <ul className="space-y-2">
              {analytics.sellPriority.map((set) => (
                <li
                  key={set.setNumber}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-zinc-950/40 p-3"
                >
                  <SetImage setNumber={set.setNumber} setName={set.name} variant="thumb" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{set.name}</p>
                    <p className="text-xs text-zinc-500">#{set.setNumber}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-white">{formatPrice(set.totalEstimatedValue)}</p>
                    <p className="text-xs text-zinc-500">
                      List {formatPrice(set.totalListPrice)}
                    </p>
                    <p className="text-xs font-semibold text-emerald-400">
                      +{formatPrice(set.profitOpportunity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Risk analysis */}
        <section className={`mt-8 grid gap-6 lg:grid-cols-2 ${sectionClass()}`}>
          <div>
            <h2 className="text-lg font-bold text-white">Portfolio Risk Score</h2>
            <p className={`mt-3 text-4xl font-black ${riskColorClass(analytics.riskLabel)}`}>
              {analytics.riskScore}/100
            </p>
            <p className={`mt-1 font-semibold ${riskColorClass(analytics.riskLabel)}`}>
              {analytics.riskLabel}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Risk factors</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {analytics.riskFactors.map((factor) => (
                <li
                  key={factor.text}
                  className={factor.positive ? "text-emerald-300" : "text-amber-200"}
                >
                  {factor.positive ? "✦" : "⚠️"} {factor.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Opportunity metrics */}
        <section className={`mt-8 ${sectionClass()}`}>
          <h2 className="text-lg font-bold text-white">Opportunity Metrics</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Avg Opportunity Score
              </p>
              <p className="mt-2 text-4xl font-black text-[#f59e0b]">
                {analytics.avgOpportunityScore}/100
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {analytics.opportunityBreakdown.Exceptional} Exceptional ·{" "}
                {analytics.opportunityBreakdown.Strong} Strong ·{" "}
                {analytics.opportunityBreakdown.Good} Good ·{" "}
                {analytics.opportunityBreakdown.Moderate} Moderate ·{" "}
                {analytics.opportunityBreakdown.Low} Low
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Top opportunities</p>
              <ul className="mt-3 space-y-2">
                {analytics.topOpportunities.map((set) => (
                  <li
                    key={set.setNumber}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-zinc-950/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{set.name}</p>
                      <span
                        className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${buySignalClassName(set.opportunity.buySignal)}`}
                      >
                        {set.opportunity.buySignal}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        {set.opportunity.opportunityScore}
                      </p>
                      <Link
                        href={`/results?set=${set.setNumber}&condition=${set.condition === "damaged-box" ? "sealed" : set.condition}`}
                        className="text-xs text-[#f59e0b] hover:underline"
                      >
                        Analyse →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {analytics.retiringSoonCount > 0 && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="font-semibold text-amber-200">
                {analytics.retiringSoonCount} retiring soon sets ·{" "}
                {formatPrice(analytics.retiringSoonValue)} combined value
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Your retiring soon sets could appreciate{" "}
                {formatPrice(analytics.retiringSoonUpsideLow)}–
                {formatPrice(analytics.retiringSoonUpsideHigh)} post retirement
              </p>
              <ul className="mt-3 space-y-2">
                {analytics.retiringSoonSets.map((set) => (
                  <li
                    key={set.setNumber}
                    className="flex items-center justify-between text-sm text-zinc-300"
                  >
                    <span>{set.name}</span>
                    <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                      Retiring Soon
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Theme performance */}
        <section className={`mt-8 ${sectionClass()}`}>
          <h2 className="text-lg font-bold text-white">Theme Performance</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-3">Theme</th>
                  <th className="py-2 px-2">Sets</th>
                  <th className="py-2 px-2">Total Value</th>
                  <th className="py-2 px-2">Avg ROI%</th>
                  <th className="py-2 px-2">Split</th>
                  <th className="py-2 px-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {analytics.themeRows.map((row, index) => (
                  <tr
                    key={row.theme}
                    className={`border-b border-white/5 ${index % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                  >
                    <td className="py-2.5 pr-3 font-medium text-white">{row.theme}</td>
                    <td className="py-2.5 px-2 text-zinc-300">{row.setCount}</td>
                    <td className="py-2.5 px-2 text-zinc-300">{formatPrice(row.totalValue)}</td>
                    <td className="py-2.5 px-2 text-zinc-300">
                      {row.avgRoiPercent >= 0 ? "+" : ""}
                      {row.avgRoiPercent}%
                    </td>
                    <td className="py-2.5 px-2 text-zinc-400">
                      {row.sellCount} SELL · {row.holdCount} HOLD
                    </td>
                    <td className="py-2.5 px-2 text-zinc-400">{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analytics.bestTheme && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
              Your {analytics.bestTheme.theme} sets have the highest average ROI at +
              {analytics.bestTheme.avgRoiPercent}%
            </div>
          )}
          {analytics.worstTheme &&
            analytics.worstTheme.theme !== analytics.bestTheme?.theme && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
                Your {analytics.worstTheme.theme} sets are averaging only +
                {analytics.worstTheme.avgRoiPercent}% ROI — consider reviewing
              </div>
            )}
        </section>

        {/* Collection composition */}
        <section className={`mt-8 ${sectionClass()}`}>
          <h2 className="text-lg font-bold text-white">Collection Composition</h2>
          <div className="mt-4 space-y-6">
            <CompositionBar
              title="Retired vs Active vs Retiring Soon"
              segments={[
                { label: "Retired", value: analytics.composition.retired, color: "bg-red-500" },
                { label: "Active", value: analytics.composition.active, color: "bg-blue-500" },
                {
                  label: "Retiring Soon",
                  value: analytics.composition.retiringSoon,
                  color: "bg-amber-500",
                },
              ]}
            />
            <CompositionBar
              title="Condition mix"
              segments={[
                { label: "Sealed", value: analytics.composition.sealed, color: "bg-emerald-500" },
                { label: "Complete", value: analytics.composition.complete, color: "bg-cyan-500" },
                {
                  label: "Incomplete",
                  value: analytics.composition.incomplete,
                  color: "bg-orange-500",
                },
              ]}
            />
            <CompositionBar
              title="Recommendation mix"
              segments={[
                { label: "SELL", value: analytics.composition.sell, color: "bg-emerald-500" },
                { label: "HOLD", value: analytics.composition.hold, color: "bg-amber-500" },
              ]}
            />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            {analytics.collectionInsights.map((insight) => (
              <li key={insight} className="flex gap-2">
                <span className="text-[#f59e0b]">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </section>

        {/* Performance timeline */}
        <section className={`mt-8 ${sectionClass()}`}>
          <h2 className="text-lg font-bold text-white">Performance Timeline</h2>
          {analytics.snapshots.length >= 2 ? (
            <>
              <div className="mt-4">
                <ValueChart snapshots={analytics.snapshots} dateRange="all" />
              </div>
              {analytics.milestones.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                  {analytics.milestones.slice(0, 4).map((m) => (
                    <li key={`${m.date}-${m.description}`}>
                      {m.icon} {m.description} ·{" "}
                      {new Date(m.date).toLocaleDateString("en-AU")}
                    </li>
                  ))}
                </ul>
              )}
              {analytics.monthlyRows.length > 1 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase text-zinc-500">
                        <th className="py-2 pr-2">Month</th>
                        <th className="py-2 px-2">Start</th>
                        <th className="py-2 px-2">End</th>
                        <th className="py-2 px-2">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.monthlyRows.slice(-6).map((row) => (
                        <tr key={row.month} className="border-b border-white/5">
                          <td className="py-2 pr-2 text-zinc-300">{row.monthLabel}</td>
                          <td className="py-2 px-2 text-zinc-400">
                            {formatPrice(row.startingValue)}
                          </td>
                          <td className="py-2 px-2 text-zinc-300">
                            {formatPrice(row.endingValue)}
                          </td>
                          <td
                            className={`py-2 px-2 font-medium ${row.changeDollars >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {row.changeDollars >= 0 ? "+" : ""}
                            {formatPrice(row.changeDollars)} ({row.changePercent >= 0 ? "+" : ""}
                            {row.changePercent}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Track your portfolio over time to see value history. Snapshots are saved as you use
              BrickValue.
            </p>
          )}
        </section>

        {/* Smart recommendations */}
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Action Now",
              text: analytics.smartRecommendations.actionNow.replace(
                "worth a combined estimated value ready to list",
                `worth ${formatPrice(analytics.sellValue)} combined`,
              ),
              border: "border-emerald-500/40",
            },
            {
              title: "Hold Strategy",
              text: analytics.smartRecommendations.holdStrategy,
              border: "border-amber-500/40",
            },
            {
              title: "Diversification",
              text: analytics.smartRecommendations.diversification,
              border: analytics.diversification && analytics.diversification.score >= 60
                ? "border-emerald-500/40"
                : "border-orange-500/40",
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`rounded-2xl border bg-white/[0.02] p-5 ${card.border}`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                {card.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{card.text}</p>
            </div>
          ))}
        </section>

        {/* Quick actions */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/portfolio/recommendations", label: "Get AI Recommendations →" },
            { href: "/growth", label: "View Growth History →" },
            { href: "/risk-reward", label: "Run Risk vs Reward →" },
            { href: "/portfolio-fit", label: "Find Portfolio Fit →" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-center text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15"
            >
              {action.label}
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
