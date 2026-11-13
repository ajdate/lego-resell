"use client";

import { useState } from "react";
import { posthog } from "@/src/lib/posthog";

export type VoteFeature = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const VOTES_KEY = "bv_feature_votes";

function loadVotes(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTES_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

/** Lets users vote on features we haven't released in the app yet. Votes go to PostHog. */
export function FeatureVoteCard({ features }: { features: VoteFeature[] }) {
  const [votes, setVotes] = useState<Set<string>>(loadVotes);

  function vote(feature: VoteFeature) {
    if (votes.has(feature.id)) return;
    posthog.capture("feature_vote", { feature: feature.id });
    const next = new Set(votes).add(feature.id);
    setVotes(next);
    try {
      localStorage.setItem(VOTES_KEY, JSON.stringify([...next]));
    } catch {}
  }

  return (
    <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5">
      <h2 className="text-base font-bold text-white">What should we build next?</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Tap the tools you&apos;d use. Your votes decide what comes to the app first.
      </p>
      <ul className="mt-4 space-y-2">
        {features.map((feature) => {
          const voted = votes.has(feature.id);
          return (
            <li key={feature.id}>
              <button
                type="button"
                onClick={() => vote(feature)}
                aria-pressed={voted}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                  voted
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-amber-500/30"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {feature.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    {feature.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-400">
                    {feature.description}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    voted ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {voted ? "✓ Voted" : "I'd use this"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
