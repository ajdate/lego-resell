"use client";

import { useState } from "react";
import type { ConfidenceResult } from "@/lib/confidence";

function formatPoints(points: number): string {
  const sign = points >= 0 ? "+" : "";
  return `${sign}${points}pts`;
}

export function ConfidenceRingBadge({
  result,
  size = "lg",
}: {
  result: ConfidenceResult;
  size?: "lg" | "md";
}) {
  const dim = size === "lg" ? "h-24 w-24" : "h-16 w-16";
  const textSize = size === "lg" ? "text-2xl" : "text-lg";
  const labelSize = size === "lg" ? "text-xs" : "text-xs";
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (result.score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative ${dim} rounded-full ${result.bgColor} ${result.borderColor} border`}
      >
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="8"
            className="stroke-zinc-800"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`stroke-current transition-all duration-700 ease-out ${result.color}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${textSize} ${result.color}`}>
            {result.score}
          </span>
        </div>
      </div>
      <p
        className={`max-w-[7rem] text-center font-medium leading-tight ${labelSize} ${result.color}`}
      >
        {result.label.replace(" Confidence", "")}
      </p>
    </div>
  );
}

export function ConfidenceCompactBadge({
  result,
}: {
  result: ConfidenceResult;
}) {
  const shortLabel = result.label
    .replace(" Confidence", "")
    .replace("Very ", "V. ");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${result.color} ${result.bgColor} ${result.borderColor}`}
    >
      {result.score} · {shortLabel}
    </span>
  );
}

export function ConfidenceBreakdown({
  result,
  toggleLabel = "View Confidence Breakdown",
}: {
  result: ConfidenceResult;
  toggleLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-[#f59e0b] transition hover:text-[#fbbf24]"
      >
        {open ? "Hide Confidence Breakdown" : toggleLabel}
      </button>
      {open && (
        <div
          className={`mt-4 rounded-xl border p-4 ${result.bgColor} ${result.borderColor}`}
        >
          <ul className="space-y-2">
            {result.factors.map((f) => (
              <li
                key={f.label}
                className={`text-sm ${
                  f.positive
                    ? "text-emerald-400"
                    : f.points < 0
                      ? "text-red-400"
                      : "text-zinc-400"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">
                    {f.positive ? "✦" : "✕"} {f.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs">
                    {formatPoints(f.points)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {f.explanation}
                </p>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-zinc-700" />
          <p className={`text-sm font-bold ${result.color}`}>
            Total: {result.score}/100 · {result.label}
          </p>
        </div>
      )}
    </div>
  );
}
