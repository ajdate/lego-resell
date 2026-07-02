"use client";

import { useRouter } from "next/navigation";

const UPDATES = [
  {
    date: "July 2026",
    items: [
      "Brickset CSV portfolio import with selective checkboxes",
      "Retiring Soon data updated - 30 sets retiring in next 6 months",
      "Multi-currency support - AUD, USD, GBP, EUR, CAD, NZD",
      "eBay pricing for AU, US and UK markets",
      "Live BrickLink sold prices",
      "Portfolio sync across all devices",
    ],
  },
  {
    date: "June 2026",
    items: [
      "AI listing generator for eBay and Facebook Marketplace",
      "Investment Simulator with CAGR calculations",
      "Benchmark comparison vs S&P 500, property and gold",
      "Risk vs Reward visualisation",
      "Profit Calculator with platform fee breakdowns",
      "21,000+ sets added from Rebrickable",
    ],
  },
] as const;

export default function WhatsNewPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 pb-24">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 block text-sm text-amber-400"
        >
          ← Back
        </button>
        <h1 className="mb-1 text-2xl font-bold text-white">What&apos;s New</h1>
        <p className="mb-8 text-sm text-white/40">
          BrickValue is constantly improving.
        </p>

        <div className="space-y-8">
          {UPDATES.map((update) => (
            <div key={update.date}>
              <h2 className="mb-3 text-sm font-bold text-amber-400">
                {update.date}
              </h2>
              <ul className="space-y-2">
                {update.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
