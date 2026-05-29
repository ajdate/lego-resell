"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PriceTargetMiniProgress } from "@/components/PriceTargetCard";
import {
  calculateProgress,
  getTargetsForSet,
  resolveCurrentValue,
  VELOCITY_COPY,
} from "@/lib/priceTargets";

export function WatchlistPriceTargets({
  setNumber,
  setName,
  theme,
  estimatedValue,
  condition = "sealed",
}: {
  setNumber: string;
  setName: string;
  theme: string;
  estimatedValue: number;
  condition?: string;
}) {
  const activeTargets = useMemo(
    () => getTargetsForSet(setNumber).filter((t) => t.status === "active"),
    [setNumber],
  );

  const progressList = useMemo(
    () =>
      activeTargets.map((target) =>
        calculateProgress(
          target,
          resolveCurrentValue(target, [
            { setNumber, estimatedValue, condition },
          ]),
        ),
      ),
    [activeTargets, setNumber, estimatedValue, condition],
  );

  const targetHref = (type: "sell" | "buy", price: number) => {
    const params = new URLSearchParams({
      add: setNumber,
      name: setName,
      theme,
      condition,
      type,
      price: String(Math.round(price)),
    });
    return `/targets?${params.toString()}`;
  };

  if (progressList.length === 0) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={targetHref("sell", estimatedValue * 1.1)}
          className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
        >
          Set Sell Target
        </Link>
        <Link
          href={targetHref("buy", estimatedValue * 0.85)}
          className="rounded-lg border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/10"
        >
          Set Buy Target
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      {progressList.map((progress) => {
        const velocity = VELOCITY_COPY[progress.velocity];
        return (
          <div key={progress.target.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`text-[10px] font-bold ${
                  progress.target.targetType === "sell"
                    ? "text-emerald-400"
                    : "text-blue-400"
                }`}
              >
                {progress.target.targetType === "sell" ? "SELL" : "BUY"} TARGET ·{" "}
                {progress.progressPercent}%
              </span>
              <Link
                href={`/targets?add=${encodeURIComponent(setNumber)}`}
                className="text-[10px] text-zinc-500 hover:text-[#f59e0b]"
              >
                Edit Target →
              </Link>
            </div>
            <PriceTargetMiniProgress progress={progress} />
            <p className={`mt-1 text-[10px] ${velocity.className}`}>
              {velocity.emoji} {progress.estimatedMonthsLabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}
