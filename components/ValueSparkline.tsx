"use client";

import type { RecommendationSnapshot } from "@/lib/recommendationHistory";

type ValueSparklineProps = {
  snapshots: RecommendationSnapshot[];
  className?: string;
};

export function ValueSparkline({ snapshots, className = "" }: ValueSparklineProps) {
  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (ordered.length === 0) return null;

  const values = ordered.map((s) => s.estimatedValue);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className={`relative ${className}`}>
      <div className="flex h-8 items-end gap-px">
        {ordered.map((snap, index) => {
          const normalized =
            ordered.length === 1 ? 1 : (snap.estimatedValue - min) / range;
          const height = Math.max(12, Math.round(normalized * 100));
          return (
            <div
              key={`${snap.date}-${index}`}
              className="flex-1 rounded-t-sm bg-amber-500/60 transition-all"
              style={{ height: `${height}%` }}
              title={`${snap.estimatedValue}`}
            />
          );
        })}
      </div>
      {ordered.length > 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
          aria-hidden
        >
          <svg
            className="h-full w-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 32"
          >
            <polyline
              fill="none"
              stroke="rgb(245 158 11 / 0.8)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              points={ordered
                .map((snap, i) => {
                  const x =
                    ordered.length === 1
                      ? 50
                      : (i / (ordered.length - 1)) * 100;
                  const normalized =
                    ordered.length === 1
                      ? 1
                      : (snap.estimatedValue - min) / range;
                  const y = 32 - Math.max(4, normalized * 28);
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
