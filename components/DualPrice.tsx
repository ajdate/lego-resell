"use client";

import { useCurrency } from "@/src/lib/currencyContext";

export function DualPrice({
  audAmount,
  size = "md",
  className = "",
}: {
  audAmount: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const { formatPrice, formatPriceSecondary } = useCurrency();

  const primaryClass =
    size === "xl"
      ? "text-3xl font-bold text-white sm:text-4xl"
      : size === "lg"
        ? "text-2xl font-bold text-white"
        : size === "sm"
          ? "text-sm font-semibold text-[#f59e0b]"
          : "text-xl font-bold text-white";

  return (
    <div className={className}>
      <p className={primaryClass}>{formatPrice(audAmount)}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{formatPriceSecondary(audAmount)}</p>
    </div>
  );
}

export function DualPriceInline({
  audAmount,
  className = "",
}: {
  audAmount: number;
  className?: string;
}) {
  const { formatDualLine } = useCurrency();
  return <span className={className}>{formatDualLine(audAmount)}</span>;
}
