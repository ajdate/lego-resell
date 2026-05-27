"use client";

import { useEffect, useRef, useState } from "react";
import { formatPointsBadge, type ScoreFactor } from "@/lib/score-utils";

export function ScoreFactorPopover({
  factors,
  score,
  label,
}: {
  factors: ScoreFactor[];
  score: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const top = [...factors]
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 3);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 text-xs text-zinc-400 transition hover:border-[#f59e0b] hover:text-[#f59e0b]"
        aria-label="Score details"
        title="Score details"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
          <p className="text-xs font-bold text-white">
            {label ?? "Score"}: {score}/100
          </p>
          <ul className="mt-2 space-y-2">
            {top.map((f) => (
              <li key={f.label} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-zinc-200">{f.label}</span>
                  <span
                    className={
                      f.points >= 0 ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {formatPointsBadge(f.points)}
                  </span>
                </div>
                <p className="mt-0.5 leading-snug text-zinc-500">
                  {f.explanation.slice(0, 120)}
                  {f.explanation.length > 120 ? "…" : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
