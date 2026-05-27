"use client";

import {
  getFullScoreLabel,
  getScoreColorSet,
} from "@/lib/score-utils";

const SIZE = {
  sm: {
    box: "h-12 w-12",
    text: "text-sm font-bold",
    label: "text-[9px]",
  },
  md: {
    box: "h-20 w-20",
    text: "text-xl font-black",
    label: "text-[10px]",
  },
  lg: {
    box: "h-32 w-32",
    text: "text-4xl font-black",
    label: "text-xs",
  },
} as const;

export function ScoreGauge({
  score,
  size = "md",
  showLabel = true,
  kind = "confidence",
}: {
  score: number;
  size?: keyof typeof SIZE;
  showLabel?: boolean;
  kind?: "confidence" | "opportunity";
}) {
  const colors = getScoreColorSet(score);
  const dims = SIZE[size];
  const pct = Math.min(100, Math.max(0, score));
  const label = getFullScoreLabel(score, kind);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative flex items-center justify-center rounded-full border-4 border-white/10 ${dims.box}`}
        style={{
          background: `conic-gradient(${colors.fill} ${pct * 3.6}deg, rgb(255 255 255 / 0.06) 0deg)`,
        }}
        role="img"
        aria-label={`${label}: ${score} out of 100`}
      >
        <div className="absolute inset-1 flex items-center justify-center rounded-full bg-[#0c0c0f]">
          <span className={`tabular-nums ${dims.text} ${colors.text}`}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <p
          className={`max-w-[8rem] text-center font-medium leading-tight ${dims.label} ${colors.text}`}
        >
          {label}
        </p>
      )}
    </div>
  );
}
