"use client";

import { useState } from "react";
import { AUD_TO_USD_RATE } from "@/src/lib/currency";
import { useCurrency } from "@/src/lib/currencyContext";

export function ExchangeRateNote() {
  const {
    audToUsdRate,
    hasCustomRate,
    setCustomExchangeRate,
    resetCustomExchangeRate,
    locationPricingNote,
    regionalContext,
  } = useCurrency();
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState(String(audToUsdRate));

  function applyRate() {
    const n = parseFloat(draft);
    if (!Number.isNaN(n) && n > 0) {
      setCustomExchangeRate(n);
      setShowEditor(false);
    }
  }

  return (
    <div className="mt-4 text-xs text-zinc-500">
      {hasCustomRate ? (
        <p>
          Using custom rate: 1 AUD = US${audToUsdRate.toFixed(2)}{" "}
          <button
            type="button"
            onClick={() => {
              resetCustomExchangeRate();
              setDraft(String(AUD_TO_USD_RATE));
            }}
            className="ml-1 text-[#f59e0b] underline-offset-2 hover:underline"
          >
            Reset
          </button>
        </p>
      ) : (
        <p>
          Exchange rate: 1 AUD ≈ US${audToUsdRate.toFixed(2)} · Updated May 2026{" "}
          <button
            type="button"
            onClick={() => {
              setDraft(String(audToUsdRate));
              setShowEditor((v) => !v);
            }}
            className="ml-1 text-zinc-400 underline-offset-2 hover:text-[#f59e0b] hover:underline"
          >
            Update rate
          </button>
        </p>
      )}

      {showEditor && !hasCustomRate && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-zinc-500">
            1 AUD = US$
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="ml-1 w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
            />
          </label>
          <button
            type="button"
            onClick={applyRate}
            className="rounded bg-[#f59e0b] px-2 py-1 font-semibold text-black"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowEditor(false)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}

      <p className="mt-2 text-zinc-500">{locationPricingNote}</p>
      <p className="mt-1 text-zinc-600">{regionalContext}</p>
    </div>
  );
}
