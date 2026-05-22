"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Recommendation } from "@/lib/analyze";
import { brickLinkCatalogUrl } from "@/lib/freshness";
import { saveSuggestedSet } from "@/lib/suggested-sets";

interface FeaturedSet {
  number: string;
  name: string;
  theme: string;
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

function ebaySoldUrl(setNumber: string) {
  const q = encodeURIComponent(`lego ${setNumber}`);
  return `https://www.ebay.com.au/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
}

export function SetNotFoundExperience({ setNumber }: { setNumber: string }) {
  const [suggestNumber, setSuggestNumber] = useState(setNumber);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [featured, setFeatured] = useState<FeaturedSet[]>([]);

  useEffect(() => {
    setSuggestNumber(setNumber);
  }, [setNumber]);

  useEffect(() => {
    fetch("/api/sets?sample=3")
      .then((res) => res.json())
      .then((data: { sample?: FeaturedSet[] }) => setFeatured(data.sample ?? []))
      .catch(() => setFeatured([]));
  }, []);

  function handleSuggest(e: FormEvent) {
    e.preventDefault();
    const num = suggestNumber.trim();
    if (!num) return;
    saveSuggestedSet({
      setNumber: num,
      notes: notes.trim(),
      date: new Date().toISOString(),
    });
    setSubmitted(true);
    setNotes("");
  }

  const displayNumber = setNumber.trim() || "—";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
        <header className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Set Not Found
          </h1>
          <p className="mt-3 text-lg font-medium text-[#f59e0b]">
            We don&apos;t have data for set #{displayNumber} yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Our database currently covers UCS Star Wars, Modulars, Creator
            Expert, Icons, Ideas, Technic and Architecture sets.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            What You Can Do
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <a
              href={brickLinkCatalogUrl(displayNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 transition hover:border-[#f59e0b]/50 hover:bg-zinc-900"
            >
              <p className="font-semibold text-white">Check BrickLink</p>
              <p className="mt-1 text-xs text-zinc-500">
                See live pricing and sold listings for this set
              </p>
            </a>
            <a
              href={ebaySoldUrl(displayNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 transition hover:border-[#f59e0b]/50 hover:bg-zinc-900"
            >
              <p className="font-semibold text-white">Check eBay Sold Listings</p>
              <p className="mt-1 text-xs text-zinc-500">
                See what this set has actually sold for recently
              </p>
            </a>
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 transition hover:border-[#f2cd00]/50 hover:bg-zinc-900"
            >
              <p className="font-semibold text-white">Search Another Set</p>
              <p className="mt-1 text-xs text-zinc-500">
                Try a different set number from our catalogue
              </p>
            </Link>
          </div>
        </section>

        <section className="mt-8 border-t border-zinc-800 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#f59e0b]">
            Suggest a Set
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Want this set added to our database?
          </p>
          {submitted ? (
            <p className="mt-4 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-400">
              ✓ Thanks! We&apos;ll review this set for inclusion.
            </p>
          ) : (
            <form onSubmit={handleSuggest} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="suggestSetNumber"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Set number
                </label>
                <input
                  id="suggestSetNumber"
                  value={suggestNumber}
                  onChange={(e) => setSuggestNumber(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white focus:border-[#f59e0b] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/40"
                />
              </div>
              <div>
                <label
                  htmlFor="suggestNotes"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="suggestNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Why is this set important to you?"
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-[#f59e0b] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/40"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[#f59e0b] px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
              >
                Submit suggestion
              </button>
            </form>
          )}
        </section>

        {featured.length > 0 && (
          <section className="mt-8 border-t border-zinc-800 pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Popular sets you might be interested in
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {featured.map((s) => {
                const isSell = s.recommendation === "SELL";
                return (
                  <Link
                    key={s.number}
                    href={`/results?set=${encodeURIComponent(s.number)}&condition=sealed`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-[#f59e0b]/40"
                  >
                    <p className="text-xs text-zinc-500">#{s.number}</p>
                    <p className="mt-1 text-sm font-semibold text-white line-clamp-2">
                      {s.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{s.theme}</p>
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
        )}
      </div>
    </div>
  );
}
