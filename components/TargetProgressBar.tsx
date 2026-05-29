"use client";

import { useEffect, useState } from "react";
import type { TargetProgress } from "@/lib/priceTargets";

type TargetProgressBarProps = {
  progress: TargetProgress;
  animate?: boolean;
  size?: "sm" | "md";
};

export function TargetProgressBar({
  progress,
  animate = true,
  size = "md",
}: TargetProgressBarProps) {
  const [width, setWidth] = useState(animate ? 0 : progress.progressPercent);
  const fillClass =
    progress.target.targetType === "sell" ? "bg-emerald-500" : "bg-blue-500";
  const heightClass = size === "sm" ? "h-2" : "h-4";

  useEffect(() => {
    if (!animate) {
      setWidth(progress.progressPercent);
      return;
    }
    const timer = window.setTimeout(() => {
      setWidth(progress.progressPercent);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [animate, progress.progressPercent]);

  return (
    <div
      className={`overflow-hidden rounded-full bg-white/10 ${heightClass}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-1000 ${fillClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
