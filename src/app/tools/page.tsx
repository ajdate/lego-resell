"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ToolCard } from "@/components/ToolCard";
import { loadPortfolio } from "@/lib/portfolio";
import {
  loadRecentTools,
  resolveRecentTools,
  type RecentToolEntry,
} from "@/lib/recent-tools";
import {
  FEATURED_EMPTY_PORTFOLIO,
  FEATURED_WITH_PORTFOLIO,
  getToolById,
  TOOLS,
} from "@/lib/tools";

export default function ToolsPage() {
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [recentTools, setRecentTools] = useState<RecentToolEntry[]>([]);

  useEffect(() => {
    setHasPortfolio(loadPortfolio().length > 0);
    setRecentTools(resolveRecentTools(loadRecentTools()));
  }, []);

  const featuredIds = hasPortfolio
    ? FEATURED_WITH_PORTFOLIO
    : FEATURED_EMPTY_PORTFOLIO;

  const featuredTools = useMemo(
    () =>
      featuredIds
        .map((id) => getToolById(id))
        .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool)),
    [featuredIds],
  );

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader title="Tools" subtitle="Advanced analysis and investment tools" />
      <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Tools</h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Advanced analysis and investment tools
          </p>
        </div>

        {featuredTools.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Featured
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {featuredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} featured />
              ))}
            </div>
          </section>
        )}

        {recentTools.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Recently Used
            </h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {recentTools.map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
                >
                  <span aria-hidden>{tool.icon}</span>
                  {tool.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            All Tools
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
