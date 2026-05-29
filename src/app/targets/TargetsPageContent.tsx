"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  PriceTargetCard,
  PriceTargetMiniProgress,
} from "@/components/PriceTargetCard";
import {
  PriceTargetFormModal,
  type TargetFormPrefill,
} from "@/components/PriceTargetFormModal";
import {
  checkAchievedTargetsFromContexts,
  formatTargetDate,
  getAchievedTargets,
  getActiveTargetsWithProgress,
  getClosestActiveTarget,
  getTargets,
  type PriceTarget,
  type TargetProgress,
} from "@/lib/priceTargets";
import { useCurrency } from "@/src/lib/currencyContext";

export default function TargetsPageContent() {
  const searchParams = useSearchParams();
  const { formatPrice } = useCurrency();
  const [progressList, setProgressList] = useState<TargetProgress[]>([]);
  const [achieved, setAchieved] = useState<PriceTarget[]>([]);
  const [celebrations, setCelebrations] = useState<PriceTarget[]>([]);
  const [showAchieved, setShowAchieved] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<PriceTarget | null>(null);
  const [prefill, setPrefill] = useState<TargetFormPrefill | undefined>();

  const refresh = useCallback(() => {
    const newlyAchieved = checkAchievedTargetsFromContexts();
    if (newlyAchieved.length > 0) {
      setCelebrations((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        return [...prev, ...newlyAchieved.filter((t) => !ids.has(t.id))];
      });
    }
    setProgressList(getActiveTargetsWithProgress());
    setAchieved(
      getAchievedTargets().sort(
        (a, b) =>
          new Date(b.dateAchieved ?? b.dateCreated).getTime() -
          new Date(a.dateAchieved ?? a.dateCreated).getTime(),
      ),
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const addSet = searchParams.get("add");
    if (!addSet) return;

    setPrefill({
      setNumber: addSet,
      setName: searchParams.get("name") ?? undefined,
      theme: searchParams.get("theme") ?? undefined,
      condition: searchParams.get("condition") ?? "sealed",
      targetType: (searchParams.get("type") as "sell" | "buy") ?? "sell",
      targetPrice: searchParams.get("price")
        ? parseFloat(searchParams.get("price")!)
        : undefined,
    });
    setFormOpen(true);
  }, [searchParams]);

  const stats = useMemo(() => {
    const all = getTargets();
    const activeCount = all.filter((t) => t.status === "active").length;
    const achievedCount = all.filter((t) => t.status === "achieved").length;
    const closest = getClosestActiveTarget();
    return { activeCount, achievedCount, closest };
  }, [progressList, achieved]);

  function openAddForm() {
    setEditingTarget(null);
    setPrefill(undefined);
    setFormOpen(true);
  }

  function openEditForm(target: PriceTarget) {
    setEditingTarget(target);
    setPrefill(undefined);
    setFormOpen(true);
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader
        title="Price Targets"
        subtitle="Track your buy and sell goals — get notified when sets hit your target"
      />

      <main className="page-main mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
          >
            Add Target +
          </button>
        </div>

        {celebrations.length > 0 && (
          <div className="mb-6 space-y-3">
            {celebrations.map((target) => (
              <div
                key={target.id}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4"
              >
                <p className="text-base font-semibold text-emerald-300">
                  🎉 Target Reached! {target.setName} has hit your target of{" "}
                  {formatPrice(target.targetPrice)}
                </p>
              </div>
            ))}
          </div>
        )}

        {progressList.length === 0 && achieved.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-lg font-semibold text-white">No price targets yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Set a buy or sell target from a set analysis or add one manually.
            </p>
            <button
              type="button"
              onClick={openAddForm}
              className="touch-target mt-6 inline-flex items-center justify-center rounded-lg bg-[#f59e0b] px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
            >
              Add Target +
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Active Targets</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stats.activeCount}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Targets Achieved</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {stats.achievedCount}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500">Closest to Target</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {stats.closest
                    ? `${stats.closest.target.setName} — ${stats.closest.progress.progressPercent}% complete`
                    : "—"}
                </p>
              </div>
            </div>

            {progressList.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-white">Progress Leaderboard</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Active targets sorted by completion — closest first
                </p>
                <ul className="mt-4 space-y-3">
                  {progressList.map((progress) => (
                    <li
                      key={progress.target.id}
                      className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="w-10 text-center text-lg font-bold text-[#f59e0b]">
                        {progress.progressPercent}%
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">
                          {progress.target.setName}
                        </p>
                        <PriceTargetMiniProgress progress={progress} />
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          progress.target.targetType === "sell"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {progress.target.targetType.toUpperCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {progressList.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-white">Active Targets</h2>
                <ul className="mt-4 space-y-4">
                  {progressList.map((progress) => (
                    <li key={progress.target.id}>
                      <PriceTargetCard
                        progress={progress}
                        onEdit={() => openEditForm(progress.target)}
                        onChanged={refresh}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {achieved.length > 0 && (
              <section className="mt-8">
                <button
                  type="button"
                  onClick={() => setShowAchieved((v) => !v)}
                  className="text-sm font-semibold text-zinc-400 hover:text-white"
                >
                  {achieved.length} Achieved Target{achieved.length === 1 ? "" : "s"}{" "}
                  {showAchieved ? "↑" : "↓"}
                </button>
                {showAchieved && (
                  <ul className="mt-4 space-y-3">
                    {achieved.map((target) => {
                      const gain = target.currentPrice - target.priceAtCreation;
                      const gainPct =
                        target.priceAtCreation > 0
                          ? Math.round((gain / target.priceAtCreation) * 100)
                          : 0;
                      return (
                        <li
                          key={target.id}
                          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-white">{target.setName}</p>
                              <p className="text-sm text-zinc-400">
                                Target: {formatPrice(target.targetPrice)} ·{" "}
                                {target.achievedManually
                                  ? "Manually marked"
                                  : target.dateAchieved
                                    ? formatTargetDate(target.dateAchieved)
                                    : "Achieved"}
                              </p>
                              <p className="mt-1 text-xs text-emerald-400/80">
                                {gain >= 0 ? "+" : ""}
                                {formatPrice(Math.abs(gain))} ({gainPct >= 0 ? "+" : ""}
                                {gainPct}%) from creation to achievement
                              </p>
                            </div>
                            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                              ✦ Goal Reached
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <PriceTargetFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTarget(null);
          setPrefill(undefined);
        }}
        onSaved={refresh}
        editingTarget={editingTarget}
        prefill={prefill}
      />
    </div>
  );
}
