"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import {
  CALCULATOR_CONDITIONS,
  computeBreakEvenPrice,
  computeEffectiveHourlyRate,
  computeMultiplier,
  computePlatformComparison,
  computeProfitBreakdown,
  computeProfitMarginPercent,
  computeRoiPercent,
  buildVerdictInsight,
  DEFAULT_HOURLY_RATE_AUD,
  DEFAULT_LISTING_MINUTES,
  DEFAULT_PACKING_MINUTES,
  DEFAULT_POSTAGE_AUD,
  getProfitVerdict,
  isCalculatorCondition,
  PLATFORMS,
  PROFIT_CALCULATOR_STORAGE_KEY,
  verdictLabel,
  type CalculatorCondition,
  type PlatformId,
  type PostagePayer,
  type ProfitInputs,
  type SavedCalculatorSettings,
} from "@/lib/profit-calculator";
import { useCurrency } from "@/src/lib/currencyContext";
import { audToUsd, usdToAud } from "@/src/lib/currency";

function parseNum(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function sectionClass() {
  return "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5";
}

function inputClass() {
  return "touch-target w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base text-white outline-none transition focus:border-[#f59e0b]/60 focus:ring-1 focus:ring-[#f59e0b]/30";
}

function labelClass() {
  return "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500";
}

function ProfitCalculatorContent() {
  const searchParams = useSearchParams();
  const { currency, formatPrice, audToUsdRate } = useCurrency();

  const [setNumber, setSetNumber] = useState("");
  const [setName, setSetName] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const [condition, setCondition] = useState<CalculatorCondition>("sealed");
  const [purchasePriceAud, setPurchasePriceAud] = useState(0);
  const [sellingPriceAud, setSellingPriceAud] = useState(0);
  const [platformId, setPlatformId] = useState<PlatformId>("ebay");
  const [postagePayer, setPostagePayer] = useState<PostagePayer>("buyer");
  const [postageCostAud, setPostageCostAud] = useState(DEFAULT_POSTAGE_AUD);
  const [packagingEnabled, setPackagingEnabled] = useState(false);
  const [originalPurchasePostageAud, setOriginalPurchasePostageAud] =
    useState(0);
  const [listingMinutes, setListingMinutes] = useState(DEFAULT_LISTING_MINUTES);
  const [packingMinutes, setPackingMinutes] = useState(DEFAULT_PACKING_MINUTES);
  const [hourlyRateAud, setHourlyRateAud] = useState(DEFAULT_HOURLY_RATE_AUD);
  const [hydrated, setHydrated] = useState(false);

  const currencySuffix = currency === "AUD" ? "AUD" : "USD";

  const toDisplay = useCallback(
    (aud: number) => {
      if (currency === "USD") {
        const usd = audToUsd(aud, audToUsdRate);
        return usd === 0 ? "" : String(Math.round(usd * 100) / 100);
      }
      return aud === 0 ? "" : String(aud);
    },
    [currency, audToUsdRate],
  );

  const fromDisplay = useCallback(
    (raw: string) => {
      const n = parseNum(raw);
      if (currency === "USD") return usdToAud(n, audToUsdRate);
      return n;
    },
    [currency, audToUsdRate],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFIT_CALCULATOR_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedCalculatorSettings;
        if (saved.platformId) setPlatformId(saved.platformId);
        if (saved.postagePayer) setPostagePayer(saved.postagePayer);
        if (typeof saved.postageCostAud === "number") {
          setPostageCostAud(saved.postageCostAud);
        }
        if (typeof saved.packagingEnabled === "boolean") {
          setPackagingEnabled(saved.packagingEnabled);
        }
        if (typeof saved.originalPurchasePostageAud === "number") {
          setOriginalPurchasePostageAud(saved.originalPurchasePostageAud);
        }
        if (typeof saved.listingMinutes === "number") {
          setListingMinutes(saved.listingMinutes);
        }
        if (typeof saved.packingMinutes === "number") {
          setPackingMinutes(saved.packingMinutes);
        }
        if (typeof saved.hourlyRateAud === "number") {
          setHourlyRateAud(saved.hourlyRateAud);
        }
      }
    } catch {
      /* ignore */
    }

    const setParam = searchParams.get("set");
    const sellParam = searchParams.get("sellPrice");
    const buyParam = searchParams.get("buyPrice");
    const conditionParam = searchParams.get("condition");

    if (setParam) setSetNumber(setParam);
    if (sellParam) setSellingPriceAud(parseNum(sellParam));
    if (buyParam) setPurchasePriceAud(parseNum(buyParam));
    if (isCalculatorCondition(conditionParam)) {
      setCondition(conditionParam);
    }

    if (setParam) {
      const cond = isCalculatorCondition(conditionParam)
        ? conditionParam
        : "sealed";
      void (async () => {
        const num = setParam.trim();
        if (!num) return;
        setLookupLoading(true);
        setLookupError("");
        const apiCondition = cond === "damaged-box" ? "sealed" : cond;
        try {
          const res = await fetch(
            `/api/sets?set=${encodeURIComponent(num)}&condition=${apiCondition}`,
          );
          if (!res.ok) return;
          const data = (await res.json()) as {
            analysis?: { set: { name: string }; estimatedValue: number };
          };
          if (data.analysis) {
            setSetName(data.analysis.set.name);
            if (!buyParam) {
              setPurchasePriceAud(data.analysis.estimatedValue);
            }
          }
        } catch {
          /* ignore background lookup */
        } finally {
          setLookupLoading(false);
        }
      })();
    }

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saved: SavedCalculatorSettings = {
      platformId,
      postagePayer,
      postageCostAud,
      packagingEnabled,
      originalPurchasePostageAud,
      listingMinutes,
      packingMinutes,
      hourlyRateAud,
    };
    try {
      localStorage.setItem(
        PROFIT_CALCULATOR_STORAGE_KEY,
        JSON.stringify(saved),
      );
    } catch {
      /* ignore */
    }
  }, [
    hydrated,
    platformId,
    postagePayer,
    postageCostAud,
    packagingEnabled,
    originalPurchasePostageAud,
    listingMinutes,
    packingMinutes,
    hourlyRateAud,
  ]);

  async function lookupSet(
    number?: string,
    lookupCondition?: string,
  ) {
    const num = (number ?? setNumber).trim();
    if (!num) {
      setLookupError("Enter a set number to look up.");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    const cond =
      lookupCondition && isCalculatorCondition(lookupCondition)
        ? lookupCondition
        : condition;
    const apiCondition =
      cond === "damaged-box" ? "sealed" : cond;
    try {
      const res = await fetch(
        `/api/sets?set=${encodeURIComponent(num)}&condition=${apiCondition}`,
      );
      if (!res.ok) {
        setSetName(null);
        setLookupError("Set not found in catalogue.");
        return;
      }
      const data = (await res.json()) as {
        analysis?: { set: { name: string }; estimatedValue: number };
      };
      if (data.analysis) {
        setSetName(data.analysis.set.name);
        setPurchasePriceAud(data.analysis.estimatedValue);
        setSetNumber(num);
      } else {
        setLookupError("Set not found in catalogue.");
      }
    } catch {
      setLookupError("Could not reach catalogue. Try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  const inputs: ProfitInputs = useMemo(
    () => ({
      purchasePriceAud,
      sellingPriceAud,
      platformId,
      postagePayer,
      postageCostAud,
      packagingEnabled,
      originalPurchasePostageAud,
      listingMinutes,
      packingMinutes,
      hourlyRateAud,
    }),
    [
      purchasePriceAud,
      sellingPriceAud,
      platformId,
      postagePayer,
      postageCostAud,
      packagingEnabled,
      originalPurchasePostageAud,
      listingMinutes,
      packingMinutes,
      hourlyRateAud,
    ],
  );

  const breakdown = useMemo(
    () => computeProfitBreakdown(inputs),
    [inputs],
  );

  const platformRows = useMemo(
    () => computePlatformComparison(inputs),
    [inputs],
  );

  const bestPlatformId = useMemo(() => {
    let best = platformRows[0];
    for (const row of platformRows) {
      if (row.netProfit > best.netProfit) best = row;
    }
    return best.id;
  }, [platformRows]);

  const selectedPlatform = PLATFORMS.find((p) => p.id === platformId);
  const feePercentLabel = selectedPlatform
    ? `${(selectedPlatform.feeRate * 100).toFixed(1).replace(/\.0$/, "")}%`
    : "0%";

  const roiPercent = computeRoiPercent(
    breakdown.netProfit,
    breakdown.purchasePrice,
  );
  const marginPercent = computeProfitMarginPercent(
    breakdown.netProfit,
    breakdown.sellingPrice,
  );
  const effectiveHourly = computeEffectiveHourlyRate(
    breakdown.netProfit,
    breakdown.totalMinutes,
  );
  const multiplier = computeMultiplier(
    breakdown.sellingPrice,
    breakdown.purchasePrice,
  );

  const breakEvenExTime = computeBreakEvenPrice(
    inputs,
    false,
    breakdown.platformFeeRate,
  );
  const breakEvenWithTime = computeBreakEvenPrice(
    inputs,
    true,
    breakdown.platformFeeRate,
  );

  const verdict = getProfitVerdict(roiPercent, breakdown.netProfit);
  const insight = buildVerdictInsight(
    breakdown.sellingPrice,
    breakdown.purchasePrice,
    breakdown.netProfit,
    roiPercent,
    selectedPlatform?.label ?? "this platform",
    formatPrice,
  );

  const verdictBorder =
    verdict === "strong"
      ? "border-emerald-500/50"
      : verdict === "modest"
        ? "border-[#f59e0b]/50"
        : "border-red-500/50";

  const verdictText =
    verdict === "strong"
      ? "text-emerald-400"
      : verdict === "modest"
        ? "text-[#fbbf24]"
        : "text-red-400";

  return (
    <div className="page-main mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Profit Calculator
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Calculate your real net profit after platform fees, postage and time
          </p>
        </div>
        <CurrencyToggle />
      </div>

      <div className="space-y-5">
        <section className={sectionClass()}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#f59e0b]">
            Your Set
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass()} htmlFor="set-number">
                Set number (optional)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="set-number"
                  type="text"
                  inputMode="numeric"
                  value={setNumber}
                  onChange={(e) => setSetNumber(e.target.value)}
                  placeholder="e.g. 10262"
                  className={inputClass()}
                />
                <button
                  type="button"
                  onClick={() => lookupSet()}
                  disabled={lookupLoading}
                  className="touch-target shrink-0 rounded-xl bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-[#fbbf24] disabled:opacity-60"
                >
                  {lookupLoading ? "Looking up…" : "Look up set"}
                </button>
              </div>
              {setName && (
                <p className="mt-2 text-sm text-emerald-400/90">{setName}</p>
              )}
              {lookupError && (
                <p className="mt-2 text-sm text-red-400">{lookupError}</p>
              )}
            </div>

            <div>
              <label className={labelClass()} htmlFor="condition">
                Condition
              </label>
              <select
                id="condition"
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as CalculatorCondition)
                }
                className={inputClass()}
              >
                {CALCULATOR_CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass()} htmlFor="purchase-price">
                Purchase price ({currencySuffix})
              </label>
              <input
                id="purchase-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={toDisplay(purchasePriceAud)}
                onChange={(e) =>
                  setPurchasePriceAud(fromDisplay(e.target.value))
                }
                placeholder="What you paid"
                className={inputClass()}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass()}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#f59e0b]">
            Your Sale
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass()} htmlFor="selling-price">
                Selling price ({currencySuffix})
              </label>
              <input
                id="selling-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={toDisplay(sellingPriceAud)}
                onChange={(e) =>
                  setSellingPriceAud(fromDisplay(e.target.value))
                }
                placeholder="List price"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass()} htmlFor="platform">
                Platform
              </label>
              <select
                id="platform"
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value as PlatformId)}
                className={inputClass()}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {(p.feeRate * 100).toFixed(1)}% fee
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={sectionClass()}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#f59e0b]">
            Postage &amp; Costs
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className={labelClass()}>Postage</p>
              <div className="flex gap-2">
                {(
                  [
                    { value: "buyer", label: "Buyer pays" },
                    { value: "seller", label: "I pay postage" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPostagePayer(opt.value)}
                    className={`touch-target flex-1 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                      postagePayer === opt.value
                        ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#fbbf24]"
                        : "border-white/10 bg-zinc-950/60 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {postagePayer === "seller" && (
              <div>
                <label className={labelClass()} htmlFor="postage-cost">
                  Postage cost ({currencySuffix})
                </label>
                <input
                  id="postage-cost"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={toDisplay(postageCostAud)}
                  onChange={(e) =>
                    setPostageCostAud(fromDisplay(e.target.value))
                  }
                  className={inputClass()}
                />
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3">
              <input
                type="checkbox"
                checked={packagingEnabled}
                onChange={(e) => setPackagingEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-zinc-600 accent-[#f59e0b]"
              />
              <span className="text-sm text-zinc-300">
                Packaging materials (+{formatPrice(5)})
              </span>
            </label>

            <div>
              <label className={labelClass()} htmlFor="original-postage">
                Original purchase postage/cost ({currencySuffix}, optional)
              </label>
              <input
                id="original-postage"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={toDisplay(originalPurchasePostageAud) || ""}
                onChange={(e) =>
                  setOriginalPurchasePostageAud(fromDisplay(e.target.value))
                }
                placeholder="0"
                className={inputClass()}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass()}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#f59e0b]">
            Time Investment
          </h2>
          <div className="mt-4 space-y-5">
            <div>
              <div className="flex justify-between text-sm">
                <label htmlFor="listing-time">Time to list</label>
                <span className="text-zinc-400">{listingMinutes} min</span>
              </div>
              <input
                id="listing-time"
                type="range"
                min={5}
                max={60}
                step={5}
                value={listingMinutes}
                onChange={(e) => setListingMinutes(Number(e.target.value))}
                className="mt-2 w-full accent-[#f59e0b]"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <label htmlFor="packing-time">Time to pack and post</label>
                <span className="text-zinc-400">{packingMinutes} min</span>
              </div>
              <input
                id="packing-time"
                type="range"
                min={10}
                max={60}
                step={5}
                value={packingMinutes}
                onChange={(e) => setPackingMinutes(Number(e.target.value))}
                className="mt-2 w-full accent-[#f59e0b]"
              />
            </div>
            <div>
              <label className={labelClass()} htmlFor="hourly-rate">
                Your hourly rate ({currencySuffix})
              </label>
              <input
                id="hourly-rate"
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                value={toDisplay(hourlyRateAud)}
                onChange={(e) =>
                  setHourlyRateAud(fromDisplay(e.target.value) || DEFAULT_HOURLY_RATE_AUD)
                }
                className={inputClass()}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.12] bg-zinc-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Net profit
          </p>
          <p
            className={`mt-2 text-4xl font-black tabular-nums ${
              breakdown.netProfit >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatPrice(breakdown.netProfit)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Live estimate — updates as you type
          </p>

          <table className="mt-6 w-full text-sm">
            <tbody className="text-zinc-300">
              <tr>
                <td className="py-1.5 text-zinc-500">Selling Price</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatPrice(breakdown.sellingPrice)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-zinc-500">
                  Platform Fee ({feePercentLabel})
                </td>
                <td className="py-1.5 text-right tabular-nums text-red-400/90">
                  −{formatPrice(breakdown.platformFee)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-zinc-500">{breakdown.postageLabel}</td>
                <td className="py-1.5 text-right tabular-nums text-red-400/90">
                  {breakdown.postage > 0
                    ? `−${formatPrice(breakdown.postage)}`
                    : formatPrice(0)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-zinc-500">Packaging</td>
                <td className="py-1.5 text-right tabular-nums text-red-400/90">
                  {breakdown.packaging > 0
                    ? `−${formatPrice(breakdown.packaging)}`
                    : formatPrice(0)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-zinc-500">Purchase Price</td>
                <td className="py-1.5 text-right tabular-nums text-red-400/90">
                  −{formatPrice(breakdown.purchasePrice)}
                </td>
              </tr>
              {breakdown.originalPurchasePostage > 0 && (
                <tr>
                  <td className="py-1.5 text-zinc-500">Purchase postage</td>
                  <td className="py-1.5 text-right tabular-nums text-red-400/90">
                    −{formatPrice(breakdown.originalPurchasePostage)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-1.5 text-zinc-500">
                  Time Cost ({breakdown.totalMinutes}min)
                </td>
                <td className="py-1.5 text-right tabular-nums text-red-400/90">
                  −{formatPrice(breakdown.timeCost)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10">
                <td className="pt-3 font-bold text-white">NET PROFIT</td>
                <td
                  className={`pt-3 text-right text-base font-bold tabular-nums ${
                    breakdown.netProfit >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {formatPrice(breakdown.netProfit)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="rounded-xl bg-white/[0.03] px-2 py-3">
              <p className="text-lg font-bold text-white">
                {Math.round(roiPercent)}%
              </p>
              <p className="text-[10px] uppercase text-zinc-500">ROI</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-2 py-3">
              <p className="text-lg font-bold text-white">
                {Math.round(marginPercent)}%
              </p>
              <p className="text-[10px] uppercase text-zinc-500">Margin</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-2 py-3">
              <p className="text-lg font-bold text-white">
                {effectiveHourly != null
                  ? formatPrice(effectiveHourly) + "/hr"
                  : "—"}
              </p>
              <p className="text-[10px] uppercase text-zinc-500">$/hr</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-2 py-3">
              <p className="text-lg font-bold text-white">
                {multiplier != null ? `${multiplier.toFixed(1)}x` : "—"}
              </p>
              <p className="text-[10px] uppercase text-zinc-500">Multiplier</p>
            </div>
          </div>
        </section>

        <section className={sectionClass()}>
          <h2 className="text-sm font-bold text-white">Platform comparison</h2>
          <ul className="mt-4 space-y-2">
            {platformRows.map((row) => {
              const isBest = row.id === bestPlatformId;
              return (
                <li
                  key={row.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm ${
                    isBest
                      ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border border-transparent bg-zinc-950/40 text-zinc-300"
                  }`}
                >
                  <span>
                    {row.shortLabel}
                    {isBest && (
                      <span className="ml-2 text-xs text-emerald-400">
                        ← Best
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-right">
                    {formatPrice(row.netProfit)} net
                    {row.feeAmount > 0 && (
                      <span className="block text-xs text-zinc-500">
                        −{formatPrice(row.feeAmount)} {row.feeLabel}
                      </span>
                    )}
                    {row.feeAmount === 0 && (
                      <span className="block text-xs text-zinc-500">
                        {row.feeLabel}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={sectionClass()}>
          <h2 className="text-sm font-bold text-white">Break even</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            <li className="flex justify-between gap-2">
              <span className="text-zinc-500">Break even price</span>
              <span className="font-medium tabular-nums text-white">
                {formatPrice(breakEvenExTime)}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-zinc-500">Break even including time</span>
              <span className="font-medium tabular-nums text-white">
                {formatPrice(breakEvenWithTime)}
              </span>
            </li>
          </ul>
        </section>

        <section
          className={`rounded-2xl border-2 bg-zinc-900/50 p-5 ${verdictBorder}`}
        >
          <p className={`text-lg font-bold ${verdictText}`}>
            {verdictLabel(verdict)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {insight}
          </p>
        </section>
      </div>

      <AppHeader title="Profit Calculator" subtitle="BrickValue tools" />
    </div>
  );
}

export default function ProfitCalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="page-main mx-auto max-w-2xl px-4 py-16 text-center text-zinc-500">
          Loading calculator…
        </div>
      }
    >
      <ProfitCalculatorContent />
    </Suspense>
  );
}
