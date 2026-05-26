"use client";

import Link from "next/link";
import {
  getDiversificationScoreStyles,
  type DiversificationInsights,
} from "@/lib/diversification";
import { useCurrency } from "@/src/lib/currencyContext";

function concentrationColor(level: string): string {
  switch (level) {
    case "High Concentration Risk":
      return "text-red-400";
    case "Moderate Concentration":
      return "text-amber-400";
    case "Balanced":
      return "text-green-400";
    default:
      return "text-emerald-400";
  }
}

export function DiversificationScoreCard({
  insights,
}: {
  insights: DiversificationInsights;
}) {
  const styles = getDiversificationScoreStyles(insights.score);

  return (
    <div
      className={`rounded-2xl border p-6 ${styles.border} ${styles.bg}`}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Diversification score
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold ${styles.color}`}>
            {insights.score}
          </span>
          <span className="text-2xl text-zinc-600">/100</span>
        </div>
        <span
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${styles.color} ${styles.bg} border ${styles.border}`}
        >
          {insights.label}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${styles.bar}`}
          style={{ width: `${insights.score}%` }}
        />
      </div>
      <p className="mt-4 text-sm text-zinc-400">{insights.shortInsight}</p>
      <p className="mt-1 text-sm text-zinc-500">
        Diversified across {insights.uniqueThemeCount} theme
        {insights.uniqueThemeCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function DiversificationInsightsSection({
  insights,
}: {
  insights: DiversificationInsights;
}) {
  const { formatPrice } = useCurrency();

  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[#f59e0b]">
        Diversification Insights
      </h2>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-medium text-zinc-300">Theme breakdown</h3>
        <div className="mt-4 flex h-12 w-full overflow-hidden rounded-lg bg-zinc-800">
          {insights.themeSegments.map((seg) =>
            seg.percent > 0 ? (
              <div
                key={seg.theme}
                className="relative flex h-full min-w-0 items-center justify-center transition-all"
                style={{
                  width: `${seg.percent}%`,
                  backgroundColor: seg.color,
                }}
                title={`${seg.theme} ${seg.percent}%`}
              >
                {seg.percent >= 12 && (
                  <span className="truncate px-1 text-[10px] font-bold text-white drop-shadow">
                    {seg.percent}%
                  </span>
                )}
              </div>
            ) : null,
          )}
        </div>
        <ul className="mt-4 space-y-2">
          {insights.themeSegments.map((seg) => (
            <li
              key={seg.theme}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="font-medium text-white">{seg.theme}</span>
                <span className="text-zinc-500">
                  {seg.setCount} {seg.setCount === 1 ? "set" : "sets"}
                </span>
              </div>
              <div className="text-right">
                <span className="font-medium text-[#f59e0b]">
                  {formatPrice(seg.totalValueAud)}
                </span>
                <span className="ml-2 text-zinc-500">{seg.percent}%</span>
                <p
                  className={`text-xs ${concentrationColor(seg.concentration)}`}
                >
                  {seg.concentration}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-medium text-zinc-300">Price brackets</h3>
        <p className="mt-1 text-xs text-zinc-500">Based on sealed AUD estimates</p>
        <ul className="mt-4 space-y-4">
          {insights.brackets.map((b) => (
            <li key={b.bracket}>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{b.label}</span>
                <span className="text-zinc-300">
                  {b.setCount} {b.setCount === 1 ? "set" : "sets"} ·{" "}
                  <span className="text-[#f59e0b]">{formatPrice(b.totalValueAud)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#f59e0b]/80"
                  style={{ width: `${Math.max(b.percent, b.setCount > 0 ? 4 : 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-medium text-zinc-300">Retired vs active</h3>
        <p className="mt-2 text-sm text-zinc-400">
          {insights.retiredPercent}% of your portfolio is retired sets
        </p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-zinc-700">
          {insights.retiredPercent > 0 && (
            <div
              className="bg-[#f59e0b] transition-all"
              style={{ width: `${insights.retiredPercent}%` }}
            />
          )}
          {insights.activePercent > 0 && (
            <div
              className="bg-zinc-500 transition-all"
              style={{ width: `${insights.activePercent}%` }}
            />
          )}
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span className="text-[#f59e0b]">Retired {insights.retiredPercent}%</span>
          <span>Active {insights.activePercent}%</span>
        </div>
        {insights.retiredInsight && (
          <p className="mt-3 text-sm text-zinc-400">{insights.retiredInsight}</p>
        )}
      </div>

      {insights.tips.length > 0 && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-medium text-zinc-300">Recommendations</h3>
          <ul className="mt-4 space-y-3">
            {insights.tips.map((tip) => (
              <li
                key={tip.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-sm leading-relaxed text-zinc-300"
              >
                {tip.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.suggestions.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-5">
          <h3 className="text-sm font-medium text-[#fbbf24]">Suggested additions</h3>
          <ul className="mt-4 space-y-3">
            {insights.suggestions.map((s) => (
              <li
                key={s.setNumber}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p className="font-mono text-xs font-bold text-[#f59e0b]">
                  {s.setNumber}
                </p>
                <p className="font-semibold text-white">{s.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {s.theme} · Est. {formatPrice(s.estimatedValueUsd)}
                </p>
                <p className="mt-2 text-sm text-zinc-400">{s.reason}</p>
                <Link
                  href={`/results?set=${encodeURIComponent(s.setNumber)}&condition=sealed`}
                  className="mt-3 inline-block text-sm font-semibold text-[#f59e0b] hover:underline"
                >
                  Analyse This Set →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
