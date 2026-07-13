import React from "react";
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  computeThemeValueSegments,
  fitLabelColorClass,
  type PortfolioFitResult,
} from "@/lib/portfolioFit";
import type { PortfolioItem } from "@/lib/portfolio";
import type { Analysis } from "@/lib/analyze-types";
import { isSetRetired, isSetRetiringSoon } from "@/lib/analyze-types";
import { fetchSetAnalysis } from "@/lib/set-analysis-client";
import { addToPortfolio } from "@/lib/portfolio";
import { addToWatchlist } from "@/lib/watchlist";

function ThemeBar({
  segments,
  highlightTheme,
  title,
}: {
  segments: ReturnType<typeof computeThemeValueSegments>;
  highlightTheme?: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">{title}</p>
      <div className="mt-2 flex h-10 w-full overflow-hidden rounded-lg bg-zinc-800 transition-all duration-500">
        {segments.map((seg) =>
          seg.percent > 0 ? (
            <div
              key={seg.theme}
              className={`flex h-full min-w-0 items-center justify-center transition-all duration-500 ${
                highlightTheme === seg.theme ? "ring-2 ring-amber-400/80" : ""
              }`}
              style={{
                width: `${seg.percent}%`,
                backgroundColor: seg.color,
              }}
              title={`${seg.theme} ${seg.percent}%`}
            >
              {seg.percent >= 10 && (
                <span className="truncate px-0.5 text-[9px] font-bold text-white drop-shadow">
                  {seg.percent}%
                </span>
              )}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

function ImpactSummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const styles =
    tone === "positive"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
      : tone === "negative"
        ? "border-red-500/30 bg-red-500/5 text-red-300"
        : "border-zinc-600/50 bg-zinc-900/40 text-zinc-300";
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">
        {title}
      </p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

function FitResultBody({
  result,
  condition,
  purchasePrice,
  portfolio,
  side,
}: {
  result: PortfolioFitResult;
  condition: string;
  purchasePrice: number;
  portfolio: PortfolioItem[];
  side?: "a" | "b";
}) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    void fetchSetAnalysis(result.setNumber, condition as "sealed").then(
      setAnalysis,
    );
  }, [result.setNumber, condition]);

  const addedValue =
    purchasePrice > 0 ? purchasePrice : result.themeConcentrationAfter;

  const beforeSegments = useMemo(
    () => computeThemeValueSegments(portfolio),
    [portfolio],
  );
  const afterSegments = useMemo(
    () =>
      computeThemeValueSegments(portfolio, {
        theme: result.theme,
        valueAud: addedValue,
      }),
    [portfolio, result.theme, addedValue],
  );

  const themeDelta = result.themeConcentrationAfter - result.themeConcentrationBefore;
  const isNewTheme = result.themeConcentrationBefore === 0;

  const divTone =
    result.diversificationImpact > 0
      ? "positive"
      : result.diversificationImpact < 0
        ? "negative"
        : "neutral";
  const divDisplay =
    result.diversificationImpact > 0
      ? `+${result.diversificationImpact} ↑`
      : result.diversificationImpact < 0
        ? `${result.diversificationImpact} ↓`
        : "Neutral →";

  const [added, setAdded] = React.useState(false);

  function handleAddPortfolio() {
    if (!analysis || added) return;
    addToPortfolio({
      setNumber: analysis.set.number,
      name: analysis.set.name,
      theme: analysis.set.theme,
      condition: condition as "sealed" | "complete" | "incomplete",
      purchasePrice: purchasePrice || analysis.estimatedValue,
      estimatedValue: analysis.estimatedValue,
      suggestedListPrice: analysis.recommendedListPrice,
      recommendation: analysis.recommendation,
      quantity: 1,
    });
    setAdded(true);
  }

  function handleWatchlist() {
    if (!analysis) return;
    addToWatchlist({
      setNumber: analysis.set.number,
      name: analysis.set.name,
      theme: analysis.set.theme,
      recommendation: analysis.recommendation,
      recommendationAtAdd: analysis.recommendation,
      estimatedValue: analysis.estimatedValue,
      dateAdded: new Date().toISOString(),
      retiredAtAdd: isSetRetired(analysis.set),
      retiringSoonAtAdd: isSetRetiringSoon(analysis.set),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:flex-row sm:items-start">
        <ScoreGauge score={result.fitScore} size="lg" showLabel={false} />
        <div className="text-center sm:text-left">
          {side && (
            <p className="text-xs font-bold uppercase text-zinc-500">
              Set {side.toUpperCase()}
            </p>
          )}
          <p
            className={`text-2xl font-black sm:text-3xl ${fitLabelColorClass(result.fitLabel)}`}
          >
            {result.fitLabel}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Fit score {result.fitScore}/100 · Best for{" "}
            <span className="text-white">{result.bestProfile}</span> collectors
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ImpactSummaryCard
          title="Diversification"
          value={divDisplay}
          tone={divTone}
        />
        <ImpactSummaryCard
          title="Risk"
          value={result.riskImpact}
          tone={
            result.riskImpact === "Reduces Risk"
              ? "positive"
              : result.riskImpact === "Increases Risk"
                ? "negative"
                : "neutral"
          }
        />
        <ImpactSummaryCard
          title="Liquidity"
          value={result.liquidityImpact}
          tone={
            result.liquidityImpact === "Improves"
              ? "positive"
              : result.liquidityImpact === "Reduces"
                ? "negative"
                : "neutral"
          }
        />
      </div>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <h3 className="text-sm font-bold text-white">Theme concentration</h3>
        <div className="mt-4 space-y-5">
          <ThemeBar
            title={`Before adding ${result.setName}:`}
            segments={beforeSegments}
          />
          <ThemeBar
            title={`After adding ${result.setName}:`}
            segments={afterSegments}
            highlightTheme={result.theme}
          />
        </div>
        <p
          className={`mt-4 text-sm font-medium ${
            isNewTheme
              ? "text-emerald-400"
              : result.isThemeOverweight
                ? "text-red-400"
                : "text-zinc-300"
          }`}
        >
          {isNewTheme
            ? `${result.theme}: 0% → ${result.themeConcentrationAfter}% (New!)`
            : `${result.theme}: ${result.themeConcentrationBefore}% → ${result.themeConcentrationAfter}% (${themeDelta >= 0 ? "+" : ""}${themeDelta}%)`}
        </p>
      </section>

      <div className="rounded-2xl border border-amber-500/30 border-l-4 border-l-amber-500 bg-amber-500/5 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-400/90">
          Personalised recommendation
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          {result.recommendation}
        </p>
      </div>

      {result.impacts.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-white">Impact breakdown</h3>
          <ul className="mt-3 space-y-2">
            {result.impacts.map((imp) => (
              <li
                key={`${imp.label}-${imp.score}`}
                className={`rounded-xl border border-zinc-800/80 border-l-4 bg-zinc-950/40 px-4 py-3 ${
                  imp.impact === "positive"
                    ? "border-l-emerald-500"
                    : imp.impact === "negative"
                      ? "border-l-red-500"
                      : "border-l-zinc-600"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex gap-2">
                    <span aria-hidden>{imp.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {imp.label}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {imp.explanation}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${
                      imp.score >= 0
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-red-500/30 bg-red-500/15 text-red-300"
                    }`}
                  >
                    {imp.score >= 0 ? "+" : ""}
                    {imp.score}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.warnings.length > 0 && (
        <section className="space-y-2">
          {result.warnings.map((w) => (
            <p
              key={w}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {w}
            </p>
          ))}
        </section>
      )}

      {result.strengths.length > 0 && (
        <section className="space-y-2">
          {result.strengths.map((s) => (
            <p
              key={s}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
            >
              {s}
            </p>
          ))}
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-white">Collector profile fit</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {result.collectorProfileFit.map((p) => {
            const isBest = p.profile === result.bestProfile;
            return (
              <div
                key={p.profile}
                className={`rounded-xl border p-4 ${
                  isBest
                    ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                    : "border-white/8 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {p.profile}
                  </p>
                  <span className="text-sm font-bold tabular-nums text-[#f59e0b]">
                    {p.fitScore}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#f59e0b] transition-all"
                    style={{ width: `${p.fitScore}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {p.reason}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={handleAddPortfolio}
          disabled={added}
          className={`touch-target flex-1 rounded-xl py-3 text-sm font-bold ${added ? 'bg-emerald-600 text-white cursor-default' : 'bg-[#f59e0b] text-zinc-900 hover:bg-[#fbbf24]'}`}
        >
          {added ? 'Added ✓' : 'Add to Portfolio →'}
        </button>
        <button
          type="button"
          onClick={handleWatchlist}
          className="touch-target flex-1 rounded-xl border border-white/15 py-3 text-sm font-semibold text-zinc-300 hover:border-[#f59e0b]/40"
        >
          Add to Watchlist →
        </button>
        <Link
          href={`/results?set=${encodeURIComponent(result.setNumber)}&condition=${condition}`}
          className="touch-target flex-1 rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-zinc-300 hover:border-[#f59e0b]/40"
        >
          Analyse Set →
        </Link>
        <Link
          href="/portfolio"
          className="touch-target flex-1 rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-zinc-300 hover:border-[#f59e0b]/40"
        >
          Adjust Portfolio →
        </Link>
      </div>
    </div>
  );
}

export function PortfolioFitResults({
  result,
  compareResult,
  condition,
  condA,
  condB,
  purchasePrice,
  priceA,
  priceB,
  portfolio,
}: {
  result?: PortfolioFitResult | null;
  compareResult?: {
    resultA: PortfolioFitResult;
    resultB: PortfolioFitResult;
    winner: "a" | "b" | "tie";
  } | null;
  condition: string;
  condA: string;
  condB: string;
  purchasePrice: number;
  priceA: number;
  priceB: number;
  portfolio: PortfolioItem[];
}) {
  if (compareResult) {
    const { resultA, resultB, winner } = compareResult;
    return (
      <div className="mt-10 space-y-8">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-transparent p-6 text-center">
          {winner === "tie" ? (
            <h2 className="text-xl font-bold text-white">
              Both sets fit similarly
            </h2>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase text-amber-300">
                Which fits better?
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {winner === "a" ? resultA.setName : resultB.setName} fits your
                portfolio better
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {winner === "a" ? resultA.fitScore : resultB.fitScore}/100 vs{" "}
                {winner === "a" ? resultB.fitScore : resultA.fitScore}/100
              </p>
            </>
          )}
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <FitResultBody
            result={resultA}
            condition={condA}
            purchasePrice={priceA}
            portfolio={portfolio}
            side="a"
          />
          <FitResultBody
            result={resultB}
            condition={condB}
            purchasePrice={priceB}
            portfolio={portfolio}
            side="b"
          />
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="mt-10">
      <FitResultBody
        result={result}
        condition={condition}
        purchasePrice={purchasePrice}
        portfolio={portfolio}
      />
    </div>
  );
}
