"use client";

import { topFactorLabels, type ScoreFactor } from "@/lib/score-utils";

export function ScoreFactorPills({
  factors,
  limit = 3,
}: {
  factors: ScoreFactor[];
  limit?: number;
}) {
  const top = topFactorLabels(factors, limit);
  if (top.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {top.map((f) => (
        <span
          key={f.label}
          title={f.explanation}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium sm:text-xs ${
            f.points >= 0
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/25 bg-red-500/10 text-red-300"
          }`}
        >
          {f.label}
        </span>
      ))}
    </div>
  );
}
