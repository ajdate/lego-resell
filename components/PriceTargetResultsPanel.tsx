"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import { PriceTargetMiniProgress } from "@/components/PriceTargetCard";
import {
  calculateProgress,
  getTargetsForSet,
  resolveCurrentValue,
} from "@/lib/priceTargets";
import { useCurrency } from "@/src/lib/currencyContext";

function buildTargetHref(
  analysis: Analysis,
  type: "sell" | "buy",
  price: number,
): string {
  const params = new URLSearchParams({
    add: analysis.set.number,
    name: analysis.set.name,
    theme: analysis.set.theme,
    condition: analysis.condition,
    type,
    price: String(Math.round(price)),
  });
  return `/targets?${params.toString()}`;
}

export function PriceTargetResultsPanel({ analysis }: { analysis: Analysis }) {
  const { formatPrice } = useCurrency();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setVersion((v) => v + 1);
  }, [analysis.set.number, analysis.estimatedValue]);

  const targets = useMemo(
    () => getTargetsForSet(analysis.set.number).filter((t) => t.status === "active"),
    [analysis.set.number, version],
  );

  const sellProgress = useMemo(() => {
    const sell = targets.find((t) => t.targetType === "sell");
    if (!sell) return null;
    const current = resolveCurrentValue(sell, [
      {
        setNumber: analysis.set.number,
        estimatedValue: analysis.estimatedValue,
        condition: analysis.condition,
      },
    ]);
    return calculateProgress(sell, current);
  }, [targets, analysis]);

  const buyProgress = useMemo(() => {
    const buy = targets.find((t) => t.targetType === "buy");
    if (!buy) return null;
    const current = resolveCurrentValue(buy, [
      {
        setNumber: analysis.set.number,
        estimatedValue: analysis.estimatedValue,
        condition: analysis.condition,
      },
    ]);
    return calculateProgress(buy, current);
  }, [targets, analysis]);

  const sellPrefill = Math.round(analysis.recommendedListPrice);
  const buyPrefill = Math.round(analysis.estimatedValue * 0.9);

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Price Targets
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Set buy or sell goals and track progress toward your target price.
      </p>

      {(sellProgress || buyProgress) && (
        <div className="mt-4 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          {sellProgress && (
            <div>
              <p className="text-sm text-zinc-300">
                You have a sell target of {formatPrice(sellProgress.target.targetPrice)} —{" "}
                <span className="font-bold text-[#f59e0b]">
                  {sellProgress.progressPercent}% complete
                </span>
              </p>
              <PriceTargetMiniProgress progress={sellProgress} />
            </div>
          )}
          {buyProgress && (
            <div>
              <p className="text-sm text-zinc-300">
                You have a buy target of {formatPrice(buyProgress.target.targetPrice)} —{" "}
                <span className="font-bold text-[#f59e0b]">
                  {buyProgress.progressPercent}% complete
                </span>
              </p>
              <PriceTargetMiniProgress progress={buyProgress} />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={buildTargetHref(analysis, "sell", sellPrefill)}
          className="touch-target inline-flex flex-1 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
        >
          Set Sell Target →
        </Link>
        <Link
          href={buildTargetHref(analysis, "buy", buyPrefill)}
          className="touch-target inline-flex flex-1 items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/10 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/15"
        >
          Set Buy Target →
        </Link>
      </div>
      <Link
        href="/targets"
        className="mt-3 inline-block text-sm text-zinc-500 hover:text-[#f59e0b] hover:underline"
      >
        View all targets →
      </Link>
    </div>
  );
}
