"use client";

import { useCurrency, type CurrencyCode } from "@/src/lib/currencyContext";

const OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: "AUD", label: "🇦🇺 AUD" },
  { value: "USD", label: "🇺🇸 USD" },
  { value: "GBP", label: "🇬🇧 GBP" },
  { value: "EUR", label: "🇪🇺 EUR" },
  { value: "CAD", label: "🇨🇦 CAD" },
  { value: "NZD", label: "🇳🇿 NZD" },
];

export function CurrencyToggle({ className = "" }: { className?: string }) {
  const { currency, setCurrency, isManuallyOverridden, resetToAutoDetect } =
    useCurrency();

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
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-label="Display currency"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition focus:border-[#f59e0b]/50"
        >
          {OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-zinc-900 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
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
