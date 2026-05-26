// Exchange rate last updated May 2026. Update manually in src/lib/currency.ts

export type CurrencyCode = "AUD" | "USD";

export const CUSTOM_EXCHANGE_RATE_KEY = "lego-custom-exchange-rate";
export const CURRENCY_PREFERENCE_KEY = "lego-currency-preference";
export const CURRENCY_NOTICE_DISMISSED_KEY = "lego-currency-notice-dismissed";

/** EU member states + EEA (BrickLink / collector pricing treated as USD) */
const EU_AND_UK_REGIONS = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "GB",
  "NO",
  "IS",
  "LI",
  "CH",
]);

const REGIONAL_CONTEXT: Record<CurrencyCode, string> = {
  AUD: "Australian market pricing. BrickLink AU + eBay AU sold listings.",
  USD: "US market pricing. BrickLink US + eBay US sold listings.",
};

export function getRegionalContext(currency: string): string {
  return currency === "AUD" ? REGIONAL_CONTEXT.AUD : REGIONAL_CONTEXT.USD;
}

export function getLocationPricingNote(
  currency: CurrencyCode,
  manuallySelected: boolean,
): string {
  if (manuallySelected) {
    return `Showing ${currency} pricing (manually selected)`;
  }
  if (currency === "AUD") {
    return "Showing Australian market pricing based on your location.";
  }
  return "Showing US market pricing based on your location.";
}

export function getRegionFromLocale(locale: string): string | undefined {
  try {
    if (typeof Intl !== "undefined" && "Locale" in Intl) {
      const LocaleCtor = Intl.Locale as typeof Intl.Locale;
      const region = new LocaleCtor(locale).region;
      if (region) return region.toUpperCase();
    }
  } catch {
    /* fall through */
  }
  const parts = locale.split("-");
  if (parts.length >= 2 && parts[1].length === 2) {
    return parts[1].toUpperCase();
  }
  return undefined;
}

export function detectCurrencyFromLocale(locale?: string): CurrencyCode {
  const resolved =
    locale ??
    (typeof navigator !== "undefined" ? navigator.language : "en-AU");
  const region = getRegionFromLocale(resolved);

  if (region === "AU") return "AUD";
  if (region === "US" || region === "CA") return "USD";
  if (region === "GB" || (region && EU_AND_UK_REGIONS.has(region))) return "USD";
  return "USD";
}

/** 1 AUD ≈ this many USD */
export const AUD_TO_USD_RATE = 0.65;
export const USD_TO_AUD_RATE = 1 / AUD_TO_USD_RATE;

export function getAudToUsdRate(): number {
  if (typeof window === "undefined") return AUD_TO_USD_RATE;
  try {
    const custom = localStorage.getItem(CUSTOM_EXCHANGE_RATE_KEY);
    if (custom) {
      const n = parseFloat(custom);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch {
    /* ignore */
  }
  return AUD_TO_USD_RATE;
}

export function getUsdToAudRate(): number {
  return 1 / getAudToUsdRate();
}

export function audToUsd(aud: number, rate = getAudToUsdRate()): number {
  return Math.round(aud * rate);
}

export function usdToAud(usd: number, rate = getAudToUsdRate()): number {
  return Math.round(usd / rate);
}

export function formatAUD(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded.toLocaleString("en-AU")} AUD`;
}

export function formatUSD(amount: number): string {
  const rounded = Math.round(amount);
  return `US$${rounded.toLocaleString("en-US")}`;
}

export function formatBoth(
  audAmount: number,
  rate = getAudToUsdRate(),
): { aud: string; usd: string } {
  return {
    aud: formatAUD(audAmount),
    usd: formatUSD(audToUsd(audAmount, rate)),
  };
}
