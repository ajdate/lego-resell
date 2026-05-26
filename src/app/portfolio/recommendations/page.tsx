"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { formatAud, loadPortfolio, type PortfolioItem } from "@/lib/portfolio";
import {
  formatSellRecommendationsForClipboard,
  type PortfolioRecommendations,
  urgencyStyles,
} from "@/lib/recommendations";

export default function RecommendationsPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] =
    useState<PortfolioRecommendations | null>(null);
  const [rawFallback, setRawFallback] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const items = loadPortfolio();
    setPortfolio(items);
    setLoaded(true);
    if (items.length === 0) return;
    void loadRecommendations(items);
  }, []);

  async function loadRecommendations(items: PortfolioItem[]) {
    setLoading(true);
    setError("");
    setRecommendations(null);
    setRawFallback("");

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio: items }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load recommendations.");
        return;
      }

      if (data.recommendations) {
        setRecommendations(data.recommendations);
      } else if (data.raw) {
        setRawFallback(data.raw);
      } else {
        setError("Unexpected response from server.");
      }
    } catch {
      setError("Failed to connect. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copySellRecommendations() {
    if (!recommendations || recommendations.sellNow.length === 0) return;
    const text = formatSellRecommendationsForClipboard(recommendations.sellNow);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setError("Could not copy — check browser permissions.");
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader
        title="AI Recommendations"
        subtitle="Personalised portfolio advice"
      />

      <main className="page-main mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/portfolio"
          className="text-sm text-zinc-500 transition hover:text-[#f59e0b]"
        >
          ← Back to portfolio
        </Link>

        {!loaded && (
          <p className="mt-12 text-center text-zinc-500">Loading…</p>
        )}

        {loaded && portfolio.length === 0 && (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-16 text-center">
            <p className="text-4xl">📦</p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No sets in your portfolio
            </h2>
            <p className="mt-2 max-w-sm text-zinc-400">
              Add sets from the analysis page before requesting AI recommendations.
            </p>
            <Link
              href="/portfolio"
              className="mt-6 rounded-xl bg-[#f59e0b] px-6 py-3 font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
            >
              Go to portfolio
            </Link>
          </div>
        )}

        {loaded && portfolio.length > 0 && loading && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-[#f59e0b]" />
            <p className="mt-6 text-lg font-medium text-white">
              AI is analysing your portfolio…
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Reviewing {portfolio.length} set{portfolio.length === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-10 rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => void loadRecommendations(portfolio)}
              className="touch-target mt-4 text-sm text-[#f59e0b] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {recommendations && !loading && (
          <div className="mt-8 space-y-6">
            <PortfolioScoreCard recommendations={recommendations} />

            <SectionCard title="Sell Now" accent="emerald">
              {recommendations.sellNow.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No immediate sell recommendations.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={copySellRecommendations}
                    className="touch-target mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3.5 text-sm font-medium text-zinc-300 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
                  >
                    {copied
                      ? "Copied to clipboard"
                      : "Copy All Sell Recommendations"}
                  </button>
                  <ul className="space-y-4">
                    {recommendations.sellNow.map((item) => (
                      <li
                        key={item.setNumber}
                        className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold text-white">
                            #{item.setNumber} {item.name}
                          </p>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-bold ${urgencyStyles(item.urgency)}`}
                          >
                            {item.urgency}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                          {item.reason}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <span className="text-zinc-500">
                            List at:{" "}
                            <span className="font-medium text-[#f59e0b]">
                              {formatAud(item.suggestedPrice)}
                            </span>
                          </span>
                          <span className="text-zinc-500">
                            Est. profit:{" "}
                            <span
                              className={`font-medium ${
                                item.potentialProfit >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {item.potentialProfit >= 0 ? "+" : ""}
                              {formatAud(item.potentialProfit)}
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </SectionCard>

            <SectionCard title="Hold" accent="amber">
              {recommendations.hold.length === 0 ? (
                <p className="text-sm text-zinc-500">No hold recommendations.</p>
              ) : (
                <ul className="space-y-4">
                  {recommendations.hold.map((item) => (
                    <li
                      key={item.setNumber}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-white">
                          #{item.setNumber} {item.name}
                        </p>
                        <span className="rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/20 px-2 py-0.5 text-xs font-bold text-[#f59e0b]">
                          {item.holdUntil}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                        {item.reason}
                      </p>
                      <p className="mt-3 text-sm text-zinc-500">
                        Projected value:{" "}
                        <span className="font-medium text-white">
                          {formatAud(item.projectedValue)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Watch List" accent="zinc">
              {recommendations.watchList.length === 0 ? (
                <p className="text-sm text-zinc-500">No watch list items.</p>
              ) : (
                <ul className="space-y-4">
                  {recommendations.watchList.map((item, i) => (
                    <li
                      key={`watch-${i}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                      <p className="font-medium text-[#f59e0b]">{item.insight}</p>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        <span className="font-medium text-zinc-500">Action: </span>
                        {item.action}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        )}

        {rawFallback && !loading && !recommendations && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="font-semibold text-[#f59e0b]">AI response</h2>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
              {rawFallback}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}

function PortfolioScoreCard({
  recommendations,
}: {
  recommendations: PortfolioRecommendations;
}) {
  const { portfolioHealth } = recommendations;
  const labelColor =
    portfolioHealth.label === "Excellent"
      ? "text-emerald-400"
      : portfolioHealth.label === "Good"
        ? "text-[#f59e0b]"
        : portfolioHealth.label === "Fair"
          ? "text-orange-400"
          : "text-red-400";

  return (
    <section className="rounded-2xl border border-[#f59e0b]/30 bg-zinc-900/50 p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Portfolio score
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-[#f59e0b]">
            {recommendations.portfolioScore}
          </span>
          <span className="text-2xl text-zinc-600">/10</span>
        </div>
        <span className={`text-lg font-semibold ${labelColor}`}>
          {portfolioHealth.label}
        </span>
      </div>
      <p className="mt-4 leading-relaxed text-zinc-300">
        {recommendations.scoreSummary}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Strengths
          </h3>
          <ul className="mt-3 space-y-2">
            {portfolioHealth.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-emerald-500">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-400">
            Weaknesses
          </h3>
          <ul className="mt-3 space-y-2">
            {portfolioHealth.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-red-400">−</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "emerald" | "amber" | "zinc";
  children: ReactNode;
}) {
  const borderClass =
    accent === "emerald"
      ? "border-emerald-900/40"
      : accent === "amber"
        ? "border-[#f59e0b]/30"
        : "border-zinc-800";

  return (
    <section
      className={`rounded-2xl border bg-zinc-900/50 p-6 ${borderClass}`}
    >
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
