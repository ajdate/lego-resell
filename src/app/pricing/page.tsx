"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/is-native-app";

async function handleSubscribe(billingPeriod: "monthly" | "annual") {
  const priceId =
    billingPeriod === "annual"
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;

  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, billingPeriod }),
  });

  const { url, error } = await response.json();
  if (error || !url) {
    alert("Please sign in to subscribe");
    return;
  }
  window.location.href = url;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [subscribing, setSubscribing] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  async function onSubscribe() {
    if (isNativeApp()) return;
    setSubscribing(true);
    try {
      await handleSubscribe(billing);
    } finally {
      setSubscribing(false);
    }
  }

  if (native) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 pb-24">
        <div className="p-8 text-center">
          <p className="text-white">
            To upgrade to BrickValue Pro, visit brickvalue.app in your browser.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-amber-400">
            ← Back to BrickValue
          </Link>
        </div>
      </div>
    );
  }

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

        <div className="relative mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white">Pro</h2>
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">
                  MOST POPULAR
                </span>
              </div>
              <p className="mt-1 text-sm text-white/40">For serious investors</p>
            </div>
            <div className="shrink-0 text-right [text-decoration:none]">
              {billing === "annual" ? (
                <div className="space-y-0.5 [text-decoration:none]">
                  <p className="text-3xl font-bold leading-none text-amber-400 [text-decoration:none]">
                    $6.67
                  </p>
                  <p className="text-xs text-white/40 [text-decoration:none]">
                    AUD/month
                  </p>
                  <p className="text-xs text-white/60 [text-decoration:none]">
                    billed as $80/year
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 [text-decoration:none]">
                  <p className="text-3xl font-bold leading-none text-amber-400 [text-decoration:none]">
                    $9.99
                  </p>
                  <p className="text-xs text-white/40 [text-decoration:none]">
                    AUD/month
                  </p>
                </div>
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
            onClick={() => void onSubscribe()}
            disabled={subscribing}
            className="block w-full rounded-xl bg-amber-500 py-3 text-center text-sm font-bold text-black transition hover:bg-amber-400 disabled:opacity-60"
          >
            {subscribing
              ? "Redirecting to checkout…"
              : `Start Pro — ${billing === "annual" ? "$80/year" : "$9.99/month"}`}
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
