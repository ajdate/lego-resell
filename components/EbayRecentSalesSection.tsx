"use client";

import { useEffect, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import type { EbaySalesResponse } from "@/lib/ebay-sales";
import { ebayActiveSearchUrl, ebaySoldSearchUrl } from "@/lib/ebay-sales";
import { fetchEbaySales } from "@/lib/ebay-sales-client";
import { useCurrency } from "@/src/lib/currencyContext";

function listingStatusLabel(
  listing: EbaySalesResponse["listings"][number],
  source: EbaySalesResponse["source"],
): string {
  if (source === "ebay_browse") {
    return "Active listing";
  }
  if (!listing.soldDate) return "Recent";
  try {
    return new Date(listing.soldDate).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recent";
  }
}

export function EbayRecentSalesSection({ analysis }: { analysis: Analysis }) {
  const { formatPrice } = useCurrency();
  const [data, setData] = useState<EbaySalesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchEbaySales(analysis.set.number, analysis.estimatedValue).then(
      (result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [analysis.set.number, analysis.estimatedValue]);

  if (loading) {
    return (
      <div className="mt-5 border-t border-white/8 pt-5">
        <p className="text-xs text-zinc-500">Loading eBay market data…</p>
      </div>
    );
  }

  if (!data?.listings?.length) {
    return null;
  }

  const isEstimated = data.mock || data.source === "estimated";
  const isActiveBrowse = !isEstimated && data.source === "ebay_browse";

  const heading = isEstimated
    ? "Estimated sales context"
    : "Active eBay listings (live)";

  const subtitle = isActiveBrowse
    ? "Current active listings on eBay AU — filter shows complete sets only"
    : isEstimated
      ? "Estimated comps when live eBay data is unavailable"
      : undefined;

  const avgPrice =
    data.averageListedPriceAud != null && data.averageListedPriceAud > 0
      ? data.averageListedPriceAud
      : null;

  return (
    <div className="mt-5 border-t border-white/8 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {heading}
        </h3>
        {isEstimated && (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            Estimated — not live listings
          </span>
        )}
        {isActiveBrowse && (
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Live · Browse API
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{subtitle}</p>
      )}
      {isActiveBrowse && avgPrice != null && (
        <p className="mt-3 text-sm font-semibold text-white">
          Avg listed price:{" "}
          <span className="text-[#f59e0b]">{formatPrice(avgPrice)}</span>
        </p>
      )}
      {data.message && (
        <p className="mt-2 text-xs text-zinc-500">{data.message}</p>
      )}
      <ul className="mt-3 divide-y divide-white/8">
        {data.listings.slice(0, 6).map((listing) => (
          <li key={listing.id} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-zinc-300">
                  {listing.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {listing.conditionLabel} ·{" "}
                  {listingStatusLabel(listing, data.source)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[#f59e0b]">
                {formatPrice(listing.priceAud)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <a
        href={
          isActiveBrowse
            ? ebayActiveSearchUrl(analysis.set.number)
            : ebaySoldSearchUrl(analysis.set.number)
        }
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs text-[#f59e0b] hover:underline"
      >
        {isActiveBrowse
          ? "View active listings on eBay AU →"
          : "View sold listings on eBay AU →"}
      </a>
    </div>
  );
}
