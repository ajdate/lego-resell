"use client";

import Link from "next/link";
import { useState } from "react";
import { SetImage } from "@/components/SetImage";
import { TargetProgressBar } from "@/components/TargetProgressBar";
import {
  deleteTarget,
  formatTargetDate,
  markTargetAchieved,
  type TargetProgress,
  VELOCITY_COPY,
} from "@/lib/priceTargets";
import { useCurrency } from "@/src/lib/currencyContext";

type PriceTargetCardProps = {
  progress: TargetProgress;
  onEdit: () => void;
  onChanged: () => void;
  compact?: boolean;
};

export function PriceTargetCard({
  progress,
  onEdit,
  onChanged,
  compact = false,
}: PriceTargetCardProps) {
  const { formatPrice } = useCurrency();
  const { target } = progress;
  const velocity = VELOCITY_COPY[progress.velocity];
  const isSell = target.targetType === "sell";
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cardClass = progress.isAchieved
    ? "border-emerald-500/40 bg-emerald-500/5"
    : progress.isClose
      ? "animate-pulse border-amber-500/40 bg-white/[0.03]"
      : "border-white/8 bg-white/[0.03]";

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteTarget(target.id);
    onChanged();
  }

  function handleMarkAchieved() {
    markTargetAchieved(target.id, true);
    onChanged();
  }

  return (
    <article className={`rounded-2xl border p-5 ${cardClass}`}>
      <div className="flex gap-4">
        <SetImage
          setNumber={target.setNumber}
          setName={target.setName}
          variant="thumb"
          className="h-16 w-16 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-bold text-[#f59e0b]">
                #{target.setNumber}
              </p>
              <h3 className="text-lg font-semibold text-white">{target.setName}</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                  {target.theme}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    isSell
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {isSell ? "SELL TARGET" : "BUY TARGET"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <TargetProgressBar progress={progress} animate={!compact} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-white">
              {formatPrice(target.currentPrice)}
            </p>
            <p className="text-sm text-white/60">
              Target: {formatPrice(target.targetPrice)}
            </p>
          </div>
          <p className="text-lg font-bold text-[#f59e0b]">
            {progress.progressPercent}% complete
          </p>
        </div>
      </div>

      <div className="mt-4">
        {progress.isAchieved ? (
          <p className="text-sm font-semibold text-emerald-400">
            ✦ Target Reached! 🎉
          </p>
        ) : (
          <p className="text-sm text-zinc-300">
            {formatPrice(progress.remainingAmount)} more to go
          </p>
        )}
      </div>

      {!progress.isAchieved && (
        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
          <p className="text-sm text-zinc-400">
            Est. timeframe:{" "}
            <span className="font-medium text-white">
              {progress.estimatedMonthsLabel}
            </span>
          </p>
          <p className={`mt-1 text-sm ${velocity.className}`}>
            {velocity.emoji} {velocity.label} — {velocity.description}
          </p>
        </div>
      )}

      <p
        className={`mt-4 text-xs ${
          progress.movingTowardTarget ? "text-emerald-400/90" : "text-red-400/90"
        }`}
      >
        Set at {formatPrice(target.priceAtCreation)} on{" "}
        {formatTargetDate(target.dateCreated)} · Now {formatPrice(target.currentPrice)} ·{" "}
        {progress.changeFromCreation >= 0 ? "+" : ""}
        {formatPrice(Math.abs(progress.changeFromCreation))} (
        {progress.changePercent >= 0 ? "+" : ""}
        {progress.changePercent}%) since target created
      </p>

      {target.notes && (
        <p className="mt-2 text-sm italic text-zinc-500">{target.notes}</p>
      )}

      {!compact && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/results?set=${encodeURIComponent(target.setNumber)}&condition=${encodeURIComponent(target.condition)}`}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            Analyse Set →
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            Edit Target
          </button>
          {target.status === "active" && (
            <button
              type="button"
              onClick={handleMarkAchieved}
              className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
            >
              Mark Achieved
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400/80 hover:bg-red-500/10"
          >
            {confirmDelete ? "Confirm Delete" : "Delete"}
          </button>
        </div>
      )}
    </article>
  );
}

export function PriceTargetMiniProgress({
  progress,
}: {
  progress: TargetProgress;
}) {
  const { formatPrice } = useCurrency();
  return (
    <div className="mt-2">
      <TargetProgressBar progress={progress} animate={false} size="sm" />
      <p className="mt-1 text-xs text-zinc-500">
        Target: {formatPrice(progress.target.targetPrice)} ·{" "}
        {progress.progressPercent}% complete
      </p>
    </div>
  );
}
