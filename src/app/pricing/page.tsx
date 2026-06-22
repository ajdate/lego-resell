"use client";

import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10 text-center">
          <Link href="/" className="mb-6 block text-sm text-amber-400">
            ← Back to BrickValue
          </Link>
          <img
            src="/brickvalue-wordmark.png"
            alt="BrickValue"
            className="mx-auto mb-6 h-10 object-contain"
          />
          <h1 className="mb-2 text-3xl font-bold text-white">
            Simple, honest pricing
          </h1>
          <p className="text-white/50">Cancel anytime. No hidden fees.</p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              billing === "monthly"
                ? "bg-white/10 text-white"
                : "text-white/40"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              billing === "annual"
                ? "bg-white/10 text-white"
                : "text-white/40"
            }`}
          >
            Annual
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
              Save 33%
            </span>
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Free</h2>
              <p className="text-sm text-white/40">For casual collectors</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">$0</div>
              <div className="text-xs text-white/40">forever</div>
            </div>
          </div>
          <ul className="mb-6 space-y-3">
            {[
              "Search 21,000+ LEGO sets",
              "SELL or HOLD recommendations",
              "Live eBay pricing",
              "BrickLink sold prices",
              "Browse by theme",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-sm text-white/70"
              >
                <span className="text-emerald-400">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-white"
          >
            Get Started Free
          </Link>
        </div>

        <div className="relative mb-4 overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
          <div className="absolute right-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">
            MOST POPULAR
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Pro</h2>
              <p className="text-sm text-white/40">For serious investors</p>
            </div>
            <div className="text-right">
              {billing === "annual" ? (
                <>
                  <div className="text-3xl font-bold text-amber-400">$6.67</div>
                  <div className="text-xs text-white/40">AUD/month</div>
                  <div className="mt-1 text-xs text-white/60">
                    billed as $80/year
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-amber-400">$9.99</div>
                  <div className="text-xs text-white/40">AUD/month</div>
                </>
              )}
            </div>
          </div>
          <ul className="mb-6 space-y-3">
            {[
              "Everything in Free",
              "Portfolio tracker — unlimited sets",
              "AI listing generator (eBay + Facebook)",
              "Profit calculator with fee breakdowns",
              "Investment simulator",
              "Risk vs Reward visualisation",
              "Benchmark comparison (S&P 500, gold, property)",
              "Set comparison tool with radar charts",
              "Investment Battles",
              "Price Targets and Goal Tracking",
              "Alert Centre",
              "Watchlist",
              "Retiring Soon monitor",
              "Opportunity Finder",
              "Data synced across all devices",
              "Priority support",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-sm text-white/70"
              >
                <span className="text-amber-400">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="block w-full rounded-xl bg-amber-500 py-3 text-center text-sm font-bold text-black transition hover:bg-amber-400"
          >
            Start Pro — {billing === "annual" ? "$80/year" : "$9.99/month"}
          </button>
          {billing === "annual" && (
            <p className="mt-3 text-center text-xs text-white/30">
              Save $39.88 compared to monthly
            </p>
          )}
        </div>

        <div className="mt-10 space-y-4">
          <h3 className="mb-4 text-lg font-bold text-white">
            Common questions
          </h3>

          {[
            {
              q: "Can I cancel anytime?",
              a: "Yes — cancel anytime from your account settings. No lock-in, no cancellation fees.",
            },
            {
              q: "Is there a free trial?",
              a: "The free plan lets you try all the core features. Pro features are available immediately when you subscribe.",
            },
            {
              q: "What currency are prices in?",
              a: "Prices are shown in AUD. The app supports AUD, USD, GBP, EUR, CAD and NZD for LEGO valuations.",
            },
            {
              q: "Do you offer refunds?",
              a: "Yes — if you are not satisfied within 7 days of subscribing we will issue a full refund. Just email support@brickvalue.app",
            },
            {
              q: "Is my data private?",
              a: "Yes — your portfolio is private and only visible to you. We never sell or share your data.",
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="mb-1 text-sm font-medium text-white">{q}</p>
              <p className="text-sm text-white/50">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-white/20">
            © 2026 BrickValue ·{" "}
            <Link href="/privacy" className="text-white/30">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
