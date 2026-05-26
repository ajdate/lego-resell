"use client";

import { useCurrency, type CurrencyCode } from "@/src/lib/currencyContext";

const OPTIONS: CurrencyCode[] = ["AUD", "USD"];

export function CurrencyToggle({ className = "" }: { className?: string }) {
  const {
    currency,
    setCurrency,
    isManuallyOverridden,
    resetToAutoDetect,
  } = useCurrency();

  return (
    <div
      id="currency-toggle"
      className={`flex flex-col items-end gap-1 ${className}`}
    >
      <div
        className="inline-flex items-center gap-1.5"
        title="Auto-detected from your location. Click to change."
      >
        <span className="text-sm leading-none" aria-hidden>
          🌐
        </span>
        <div
          className="inline-flex rounded-lg border border-zinc-700/80 bg-white/5 p-0.5"
          role="group"
          aria-label="Display currency"
        >
          {OPTIONS.map((code) => {
            const active = currency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                className={`touch-target min-w-[3rem] rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-[#f59e0b] text-black"
                    : "bg-transparent text-white/50 hover:text-white/80"
                }`}
                aria-pressed={active}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>
      {isManuallyOverridden && (
        <button
          type="button"
          onClick={resetToAutoDetect}
          className="text-[10px] text-zinc-500 underline-offset-2 hover:text-[#f59e0b] hover:underline"
        >
          Reset to auto
        </button>
      )}
    </div>
  );
}
