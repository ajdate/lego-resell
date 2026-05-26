"use client";

import {
  computeIntentDashboard,
  type IntentDashboardSummary,
} from "@/lib/portfolio-intent";
import type { PortfolioItem } from "@/lib/portfolio";
import { useCurrency } from "@/src/lib/currencyContext";

export function PortfolioIntentDashboard({ items }: { items: PortfolioItem[] }) {
  const { formatDualLine } = useCurrency();
  const summary: IntentDashboardSummary = computeIntentDashboard(items);
  if (summary.totalCopies === 0) return null;

  const maxCount = Math.max(...summary.rows.map((r) => r.copyCount), 1);

  return (
    <section className="w-full min-w-0 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-[#f59e0b]">Copies by intent</h3>
      <p className="mt-1 text-xs text-zinc-500">
        {summary.totalCopies} total {summary.totalCopies === 1 ? "copy" : "copies"}
      </p>

      <ul className="mt-4 space-y-3">
        {summary.rows.map((row) => (
          <li key={row.tag}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${row.className}`}
              >
                {row.label}
              </span>
              <span className="text-zinc-400">
                {row.copyCount} {row.copyCount === 1 ? "copy" : "copies"},{" "}
                {formatDualLine(row.totalValueAud)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${
                  row.tag === "undecided"
                    ? "bg-amber-500/70"
                    : row.tag === "flip-soon"
                      ? "bg-amber-400"
                      : row.tag === "hold-retirement"
                        ? "bg-blue-500"
                        : row.tag === "hold-long"
                          ? "bg-purple-500"
                          : row.tag === "personal"
                            ? "bg-green-500"
                            : "bg-orange-500"
                }`}
                style={{ width: `${(row.copyCount / maxCount) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      {summary.undecidedCount > 0 && (
        <p
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
          role="alert"
        >
          {summary.undecidedCount} undecided{" "}
          {summary.undecidedCount === 1 ? "copy" : "copies"} — review these and
          assign an intent
        </p>
      )}
    </section>
  );
}
