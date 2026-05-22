"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Analysis } from "@/lib/analyze";
import { formatUsd } from "@/lib/market-opportunities";
import {
  buySignalClassName,
  opportunitySetFromLego,
  scoreOpportunity,
} from "@/lib/opportunityScoring";

export function OpportunityScorePanel({ analysis }: { analysis: Analysis }) {
  const opportunity = useMemo(
    () =>
      scoreOpportunity(
        opportunitySetFromLego(
          analysis.set,
          analysis.recommendation,
          analysis.estimatedValue,
        ),
      ),
    [analysis],
  );

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
            Market Opportunity
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Buying and holding potential based on theme, status, and market
            timing
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-white">
            {opportunity.opportunityScore}
          </p>
          <p className="text-sm font-semibold text-zinc-400">
            {opportunity.opportunityLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`rounded-md px-3 py-1 text-sm font-bold ${buySignalClassName(opportunity.buySignal)}`}
        >
          {opportunity.buySignal}
        </span>
        {opportunity.opportunityType.map((type) => (
          <span
            key={type}
            className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
          >
            {type}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
          <p className="text-xs text-zinc-500">12 month projection</p>
          <p className="mt-1 font-semibold text-white">
            {formatUsd(opportunity.projectedValue12m)}
          </p>
          <p className="text-sm text-emerald-400">
            +{opportunity.projectedROI12m}%
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
          <p className="text-xs text-zinc-500">24 month projection</p>
          <p className="mt-1 font-semibold text-white">
            {formatUsd(opportunity.projectedValue24m)}
          </p>
          <p className="text-sm text-emerald-400">
            +{opportunity.projectedROI24m}%
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {opportunity.reasoning.map((line) => (
          <li
            key={line}
            className="flex gap-2 text-sm leading-relaxed text-zinc-400"
          >
            <span className="text-[#f59e0b]">•</span>
            {line}
          </li>
        ))}
      </ul>

      <Link
        href="/opportunities"
        className="mt-4 inline-block text-sm font-semibold text-[#f59e0b] hover:underline"
      >
        See All Opportunities →
      </Link>
    </div>
  );
}
