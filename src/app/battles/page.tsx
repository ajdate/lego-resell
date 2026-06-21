"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { QUICK_BATTLES } from "@/lib/investmentSimulator";
import { buildSimulatorHref } from "@/lib/simulator-url";

export default function BattlesPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader title="Battles" subtitle="Quick investment battles" />
      <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <Link
            href="/tools"
            className="text-sm text-zinc-500 transition hover:text-[#f59e0b]"
          >
            ← Tools
          </Link>
          <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">
            Investment Battles
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Quick head-to-head battles — tap to run in the simulator
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_BATTLES.map((battle) => (
            <Link
              key={battle.id}
              href={buildSimulatorHref({
                setA: battle.setA,
                setB: battle.setB,
                startYear: battle.startYear,
                amount: 1000,
              })}
              className="group relative block rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-all hover:border-amber-500/30 hover:bg-white/[0.05] active:scale-95"
            >
              <span className="absolute right-4 top-4 text-white/30 transition group-hover:text-white/50">
                →
              </span>
              <p className="mb-2 text-3xl">⚔️</p>
              <p className="text-base font-bold text-white">{battle.title}</p>
              <p className="mt-1 text-sm text-white/50">{battle.subtitle}</p>
              <p className="mt-3 text-xs font-medium text-[#f59e0b]">
                From {battle.startYear} · $1,000 investment
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/simulator"
            className="inline-flex items-center justify-center rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-5 py-3 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/15"
          >
            Open full simulator →
          </Link>
        </div>
      </main>
    </div>
  );
}
