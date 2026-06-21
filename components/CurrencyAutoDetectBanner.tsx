"use client";

import { useCurrency } from "@/src/lib/currencyContext";

export function CurrencyAutoDetectBanner() {
  const {
    currency,
    isManuallyOverridden,
    isLocationNoticeDismissed,
    dismissLocationNotice,
    isHydrated,
  } = useCurrency();

  if (!isHydrated || isManuallyOverridden || isLocationNoticeDismissed) {
    return null;
  }

  const label = currency === "AUD" ? "AUD" : "USD";

  return (
    <div
      className="mb-4 flex flex-col gap-3 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="text-sm text-[#fbbf24]">
        📍 Prices shown in {label} based on your location.{" "}
        <a
          href="#currency-toggle"
          className="font-semibold text-[#f59e0b] underline-offset-2 hover:underline"
        >
          Change currency →
        </a>
      </p>
      <button
        type="button"
        onClick={dismissLocationNotice}
        className="shrink-0 self-start rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white sm:self-center"
      >
        Dismiss
      </button>
    </div>
  );
}
