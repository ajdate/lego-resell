"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { GoalSelector } from "@/components/GoalSelector";
import {
  getAllMarketOpportunities,
  getOpportunitiesSummary,
} from "@/lib/market-opportunities";
import { QUICK_BATTLES } from "@/lib/investmentSimulator";
import {
  completeOnboarding,
  getUserGoal,
  isOnboardingComplete,
  skipOnboarding,
  type UserGoal,
} from "@/lib/onboarding";
import { BrickValueLogo } from "@/components/BrickValueLogo";

type Screen = 1 | 2 | 3;

function ProgressDots({ screen }: { screen: Screen }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={`h-2 w-2 rounded-full transition-colors ${
            step <= screen ? "bg-[#f59e0b]" : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferencesOnly = searchParams.get("preferences") === "1";
  const initialStep = searchParams.get("step") === "2" ? 2 : 1;

  const [screen, setScreen] = useState<Screen>(initialStep as Screen);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [selectedGoal, setSelectedGoal] = useState<
    Exclude<UserGoal, "general"> | null
  >(null);
  const [animating, setAnimating] = useState(false);

  const opportunitiesSummary = useMemo(
    () => getOpportunitiesSummary(getAllMarketOpportunities()),
    [],
  );

  const featuredBattle = QUICK_BATTLES[1];

  useEffect(() => {
    if (preferencesOnly) return;
    if (isOnboardingComplete()) {
      router.replace("/");
    }
  }, [preferencesOnly, router]);

  useEffect(() => {
    const existing = getUserGoal();
    if (
      existing === "investor" ||
      existing === "collector" ||
      existing === "learner" ||
      existing === "seller" ||
      existing === "researcher"
    ) {
      setSelectedGoal(existing);
    }
  }, []);

  const goToScreen = useCallback((next: Screen, dir: "forward" | "back") => {
    setDirection(dir);
    setAnimating(true);
    window.setTimeout(() => {
      setScreen(next);
      setAnimating(false);
    }, 180);
  }, []);

  function handleSkip() {
    if (preferencesOnly) {
      router.push("/");
      return;
    }
    skipOnboarding();
    router.push("/");
  }

  function handleComplete(href: string) {
    if (!selectedGoal) return;
    completeOnboarding(selectedGoal);
    window.dispatchEvent(new Event("lego-goal-changed"));
    router.push(href);
  }

  const slideClass = animating
    ? direction === "forward"
      ? "-translate-x-4 opacity-0"
      : "translate-x-4 opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[#0a0a0a] md:min-h-screen">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          {screen > 1 && !preferencesOnly ? (
            <button
              type="button"
              onClick={() => goToScreen((screen - 1) as Screen, "back")}
              className="text-sm text-white/50 transition hover:text-white"
            >
              ← Back
            </button>
          ) : preferencesOnly && screen > 2 ? (
            <button
              type="button"
              onClick={() => goToScreen(2, "back")}
              className="text-sm text-white/50 transition hover:text-white"
            >
              ← Back
            </button>
          ) : preferencesOnly ? (
            <Link href="/" className="text-sm text-white/50 hover:text-white">
              ← Home
            </Link>
          ) : (
            <span className="w-12" />
          )}
          <ProgressDots screen={screen} />
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-white/30 transition hover:text-white/50"
          >
            Skip
          </button>
        </div>

        <div className={`flex flex-1 flex-col transition-all duration-300 ${slideClass}`}>
          {screen === 1 && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <BrickValueLogo className="mx-auto h-16 w-auto" />
              <h1 className="mt-8 text-3xl font-black text-white">
                Welcome to BrickValue
              </h1>
              <p className="mt-3 max-w-sm text-base text-white/50">
                The smart assistant for LEGO collectors and investors
              </p>
              <ul className="mt-10 w-full max-w-sm space-y-4 text-left">
                {[
                  { icon: "🔍", text: "Instant set valuations" },
                  { icon: "📈", text: "SELL or HOLD recommendations" },
                  { icon: "🤖", text: "AI marketplace listings" },
                ].map((item) => (
                  <li
                    key={item.text}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium text-white">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => goToScreen(2, "forward")}
                className="mt-10 w-full max-w-sm rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] py-4 text-base font-bold text-zinc-900 shadow-lg shadow-amber-500/20 transition hover:brightness-110"
              >
                Get Started →
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="mt-4 text-sm text-white/30 transition hover:text-white/50"
              >
                Skip setup
              </button>
            </div>
          )}

          {screen === 2 && (
            <div className="flex flex-1 flex-col">
              <div className="mb-6">
                <h1 className="text-2xl font-black text-white">
                  What brings you here?
                </h1>
                <p className="mt-2 text-sm text-white/50">
                  We&apos;ll personalise your experience
                </p>
              </div>
              <GoalSelector
                selected={selectedGoal}
                onSelect={setSelectedGoal}
              />
              <button
                type="button"
                disabled={!selectedGoal}
                onClick={() => goToScreen(3, "forward")}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] py-4 text-base font-bold text-zinc-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="mt-4 text-center text-sm text-white/30 transition hover:text-white/50"
              >
                Skip
              </button>
            </div>
          )}

          {screen === 3 && selectedGoal && (
            <div className="flex flex-1 flex-col justify-center">
              {selectedGoal === "investor" && (
                <>
                  <h1 className="text-2xl font-black text-white">
                    Start with Opportunities
                  </h1>
                  <p className="mt-3 text-sm text-white/50">
                    We&apos;ve found {opportunitiesSummary.strongBuyCount} sets
                    with strong buy signals right now
                  </p>
                  <button
                    type="button"
                    onClick={() => handleComplete("/opportunities")}
                    className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] py-4 text-base font-bold text-zinc-900"
                  >
                    View Opportunities →
                  </button>
                  <Link
                    href="/"
                    onClick={() => {
                      completeOnboarding(selectedGoal);
                      window.dispatchEvent(new Event("lego-goal-changed"));
                    }}
                    className="mt-4 block text-center text-sm font-semibold text-white/50 hover:text-white"
                  >
                    Or search a specific set →
                  </Link>
                </>
              )}

              {selectedGoal === "collector" && (
                <>
                  <h1 className="text-2xl font-black text-white">
                    Build your portfolio
                  </h1>
                  <p className="mt-3 text-sm text-white/50">
                    Search for a set you own to get started
                  </p>
                  <button
                    type="button"
                    onClick={() => handleComplete("/?focus=search")}
                    className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] py-4 text-base font-bold text-zinc-900"
                  >
                    Search My First Set →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComplete("/portfolio")}
                    className="mt-4 w-full text-center text-sm font-semibold text-white/50 hover:text-white"
                  >
                    Or view your empty portfolio →
                  </button>
                </>
              )}

              {selectedGoal === "learner" && (
                <>
                  <h1 className="text-2xl font-black text-white">
                    Start with a Battle
                  </h1>
                  <p className="mt-3 text-sm text-white/50">
                    See how two legendary LEGO sets performed as investments
                  </p>
                  <p className="mt-2 text-xs text-amber-300/80">
                    {featuredBattle.title} — {featuredBattle.subtitle}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleComplete("/battles")}
                    className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] py-4 text-base font-bold text-zinc-900"
                  >
                    Run an Investment Battle →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComplete("/simulator")}
                    className="mt-4 w-full text-center text-sm font-semibold text-white/50 hover:text-white"
                  >
                    Or try the simulator →
                  </button>
                </>
              )}

              {selectedGoal === "seller" && (
                <>
                  <h1 className="text-2xl font-black text-white">
                    Calculate your profit
                  </h1>
                  <p className="mt-3 text-sm text-white/50">
                    Enter a set and we&apos;ll show your real net return
                  </p>
                  <button
                    type="button"
                    onClick={() => handleComplete("/profit-calculator")}
                    className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] py-4 text-base font-bold text-zinc-900"
                  >
                    Open Profit Calculator →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComplete("/?focus=search")}
                    className="mt-4 w-full text-center text-sm font-semibold text-white/50 hover:text-white"
                  >
                    Or search a set first →
                  </button>
                </>
              )}

              {selectedGoal === "researcher" && (
                <>
                  <h1 className="text-2xl font-black text-white">
                    Compare two sets
                  </h1>
                  <p className="mt-3 text-sm text-white/50">
                    Pick any two sets and see them head-to-head
                  </p>
                  <button
                    type="button"
                    onClick={() => handleComplete("/compare")}
                    className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] py-4 text-base font-bold text-zinc-900"
                  >
                    Start Comparing →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComplete("/browse")}
                    className="mt-4 w-full text-center text-sm font-semibold text-white/50 hover:text-white"
                  >
                    Or browse all sets →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-500">
          Loading…
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
