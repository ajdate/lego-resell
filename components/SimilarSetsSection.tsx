"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recommendation } from "@/lib/analyze";

interface SimilarSet {
  number: string;
  name: string;
  estimatedValue: number;
  recommendation: Recommendation;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SimilarSetsSection({ setNumber }: { setNumber: string }) {
  const [similar, setSimilar] = useState<SimilarSet[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/sets?similarTo=${encodeURIComponent(setNumber)}`)
      .then((res) => res.json())
      .then((data: { similar?: SimilarSet[] }) => {
        setSimilar(data.similar ?? []);
        setLoaded(true);
      })
      .catch(() => {
        setSimilar([]);
        setLoaded(true);
      });
  }, [setNumber]);

  if (!loaded || similar.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[#f59e0b]">
        Similar Sets You Might Consider
      </h2>
      <div className="filter-scroll -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
        {similar.map((s) => {
          const isSell = s.recommendation === "SELL";
          return (
            <Link
              key={s.number}
              href={`/results?set=${encodeURIComponent(s.number)}&condition=sealed`}
              className="w-[min(85vw,280px)] shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-[#f59e0b]/40 hover:bg-zinc-900 md:w-auto"
            >
              <p className="text-xs font-medium text-zinc-500">#{s.number}</p>
              <p className="mt-1 text-sm font-semibold text-white line-clamp-2">
                {s.name}
              </p>
              <p className="mt-2 text-sm text-[#f59e0b]">
                {formatUsd(s.estimatedValue)}
              </p>
              <span
                className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                  isSell
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {s.recommendation}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
