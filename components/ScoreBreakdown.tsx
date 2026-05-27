"use client";

import { useId, useState } from "react";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  buildScoreSummary,
  factorBarWidth,
  factorIcon,
  formatPointsBadge,
  getFullScoreLabel,
  type ScoreFactor,
} from "@/lib/score-utils";

export function ScoreBreakdown({
  score,
  factors,
  title,
  kind = "confidence",
  defaultOpen = false,
  gaugeSize = "lg",
  showGauge = true,
}: {
  score: number;
  factors: ScoreFactor[];
  title: string;
  kind?: "confidence" | "opportunity";
  defaultOpen?: boolean;
  gaugeSize?: "sm" | "md" | "lg";
  showGauge?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const summary = buildScoreSummary(factors);
  const fullLabel = getFullScoreLabel(score, kind);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
        {showGauge && (
          <ScoreGauge score={score} size={gaugeSize} showLabel kind={kind} />
        )}
        <div className={showGauge ? "flex-1 text-center sm:text-left" : "w-full"}>
          <p className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
            {title}
          </p>
          {!showGauge && (
            <p className="mt-1 text-2xl font-black text-white tabular-nums">
              {score}
              <span className="text-base font-normal text-zinc-500">/100</span>
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#f59e0b]/40"
      >
        <span>Why this score?</span>
        <span className="text-[#f59e0b] transition-transform duration-300">
          {open ? "↑" : "↓"}
        </span>
      </button>

      <div
        id={panelId}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? "2000px" : "0px" }}
      >
        <div className="pt-4">
          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2 font-medium">Factor</th>
                  <th className="hidden px-2 py-2 sm:table-cell">Impact</th>
                  <th className="px-3 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f, i) => (
                  <tr
                    key={f.label}
                    className={
                      i % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"
                    }
                  >
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <span className="shrink-0" aria-hidden>
                          {factorIcon(f.positive, f.points)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-white">{f.label}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 sm:hidden">
                            {f.explanation}
                          </p>
                          <div className="mt-2 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className={`h-full rounded-full ${
                                f.points >= 0
                                  ? "bg-emerald-500/70"
                                  : "bg-red-500/70"
                              }`}
                              style={{
                                width: `${factorBarWidth(f.points)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-2 py-3 text-xs leading-relaxed text-zinc-400 sm:table-cell">
                      {f.explanation}
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${
                          f.points >= 0
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                            : "border-red-500/30 bg-red-500/15 text-red-300"
                        }`}
                      >
                        {formatPointsBadge(f.points)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.03]">
                  <td
                    colSpan={3}
                    className="px-3 py-3 text-sm font-bold text-white"
                  >
                    Total Score: {score}/100 · {fullLabel}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-4 text-sm italic leading-relaxed text-white/70">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
}
