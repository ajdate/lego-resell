"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAllMarketOpportunities,
  getOpportunitiesSummary,
} from "@/lib/market-opportunities";
import { QUICK_BATTLES } from "@/lib/investmentSimulator";
import {
  computePortfolioMetrics,
  loadPortfolio,
} from "@/lib/portfolio";
import {
  getUserGoal,
  isPersonalizedGoal,
  type UserGoal,
} from "@/lib/onboarding";
import { useCurrency } from "@/src/lib/currencyContext";

type PersonalizedHomeCardProps = {
  onFocusSearch?: () => void;
};

export function PersonalizedHomeCard({ onFocusSearch }: PersonalizedHomeCardProps) {
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    setGoal(getUserGoal());
    const onGoalChange = () => setGoal(getUserGoal());
    window.addEventListener("lego-goal-changed", onGoalChange);
    return () => window.removeEventListener("lego-goal-changed", onGoalChange);
  }, []);

  const opportunitiesSummary = useMemo(() => {
    return getOpportunitiesSummary(getAllMarketOpportunities());
  }, []);

  const portfolioSummary = useMemo(() => {
    const items = loadPortfolio();
    if (items.length === 0) return null;
    const metrics = computePortfolioMetrics(items);
    return {
      count: items.length,
      totalEstimated: metrics.totalEstimated,
      percentGain: metrics.percentGain,
    };
  }, [goal]);

  const featuredBattle = QUICK_BATTLES[1];

  if (!isPersonalizedGoal(goal)) return null;

  const changePreferencesHref = "/onboarding?step=2&preferences=1";

  let content: {
    icon: string;
    headline: string;
    body: string;
    primaryLabel: string;
    primaryHref?: string;
    primaryAction?: () => void;
  };

  switch (goal) {
    case "investor":
      content = {
        icon: "🔥",
        headline: "Top Opportunities",
        body: `We've found ${opportunitiesSummary.strongBuyCount} sets with strong buy signals right now.`,
        primaryLabel: "View Opportunities →",
        primaryHref: "/opportunities",
      };
      break;
    case "collector":
      content = portfolioSummary
        ? {
            icon: "📦",
            headline: "Your Portfolio",
            body: `${portfolioSummary.count} sets tracked · ${formatPrice(portfolioSummary.totalEstimated)} estimated value · ${portfolioSummary.percentGain >= 0 ? "+" : ""}${portfolioSummary.percentGain}% gain`,
            primaryLabel: "Open Portfolio →",
            primaryHref: "/portfolio",
          }
        : {
            icon: "📦",
            headline: "Build your portfolio",
            body: "Search for a set you own to start tracking value and recommendations.",
            primaryLabel: "Search My First Set →",
            primaryAction: onFocusSearch,
          };
      break;
    case "learner":
      content = {
        icon: "⚔️",
        headline: "Featured Battle",
        body: `${featuredBattle.title} — ${featuredBattle.subtitle}`,
        primaryLabel: "Run an Investment Battle →",
        primaryHref: "/battles",
      };
      break;
    case "seller":
      content = {
        icon: "💰",
        headline: "Quick Profit Check",
        body: "Search a set to see estimated value, then open the profit calculator for real net return.",
        primaryLabel: "Search a Set →",
        primaryAction: onFocusSearch,
      };
      break;
    case "researcher":
      content = {
        icon: "⚖️",
        headline: "Compare Sets",
        body: "Pick any two sets and see them head-to-head across scores, metrics and recommendations.",
        primaryLabel: "Start Comparing →",
        primaryHref: "/compare",
      };
      break;
    default:
      return null;
  }

  return (
    <section className="px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            {content.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">{content.headline}</p>
            <p className="mt-1 text-sm text-white/60">{content.body}</p>
            {content.primaryHref ? (
              <Link
                href={content.primaryHref}
                className="mt-3 inline-flex rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-bold text-zinc-900 transition hover:bg-[#fbbf24]"
              >
                {content.primaryLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={content.primaryAction}
                className="mt-3 inline-flex rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-bold text-zinc-900 transition hover:bg-[#fbbf24]"
              >
                {content.primaryLabel}
              </button>
            )}
            <div className="mt-3">
              <Link
                href={changePreferencesHref}
                className="text-xs text-white/40 transition hover:text-white/60"
              >
                Change preferences
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
