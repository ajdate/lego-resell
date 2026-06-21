// Exchange rates last updated June 2026. Update manually in src/lib/currency.ts
// All rates are: 1 AUD = X in target currency

export const EXCHANGE_RATES = {
  AUD: 1,
  USD: 0.64,
  GBP: 0.51,
  EUR: 0.6,
  CAD: 0.88,
  NZD: 1.09,
} as const;

export const CURRENCY_SYMBOLS = {
  AUD: "A$",
  USD: "US$",
  GBP: "£",
  EUR: "€",
  CAD: "C$",
  NZD: "NZ$",
} as const;

export const CURRENCY_LABELS = {
  AUD: "AUD",
  USD: "USD",
  GBP: "GBP",
  EUR: "EUR",
  CAD: "CAD",
  NZD: "NZD",
} as const;

export const SUPPORTED_CURRENCIES = [
  "AUD",
  "USD",
  "GBP",
  "EUR",
  "CAD",
  "NZD",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const BRICKVALUE_CURRENCY_KEY = "brickvalue-currency";
export const CURRENCY_PREFERENCE_KEY = "lego-currency-preference";
export const CUSTOM_EXCHANGE_RATE_KEY = "lego-custom-exchange-rate";
export const CURRENCY_NOTICE_DISMISSED_KEY = "lego-currency-notice-dismissed";

const EU_COUNTRY_CODES = new Set([
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "AT",
  "IE",
  "PT",
  "FI",
  "GR",
  "LU",
  "SK",
  "SI",
  "EE",
  "LV",
  "LT",
  "CY",
  "MT",
]);

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  AU: "AUD",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  NZ: "NZD",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
};

const REGIONAL_CONTEXT: Record<CurrencyCode, string> = {
  AUD: "Australian market pricing. BrickLink AU + eBay AU sold listings.",
  USD: "US market pricing. BrickLink US + eBay US sold listings.",
  GBP: "UK market pricing. BrickLink UK + eBay UK sold listings.",
  EUR: "EU market pricing. BrickLink EU + regional sold listings.",
  CAD: "Canadian market pricing. BrickLink + eBay CA sold listings.",
  NZD: "New Zealand market pricing. BrickLink + eBay NZ sold listings.",
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function getRegionalContext(currency: string): string {
  if (isCurrencyCode(currency)) return REGIONAL_CONTEXT[currency];
  return REGIONAL_CONTEXT.USD;
}

export function getLocationPricingNote(
  currency: CurrencyCode,
  manuallySelected: boolean,
): string {
  if (manuallySelected) {
    return `Showing ${CURRENCY_LABELS[currency]} pricing (manually selected)`;
  }
  return `Showing ${CURRENCY_LABELS[currency]} pricing based on your location.`;
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

  if (region && COUNTRY_TO_CURRENCY[region]) {
    return COUNTRY_TO_CURRENCY[region];
  }
  if (region && EU_COUNTRY_CODES.has(region)) return "EUR";
  return "USD";
}

export async function detectUserCurrency(): Promise<CurrencyCode> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = (await res.json()) as { country_code?: string };
    const code = data.country_code;
    if (code && COUNTRY_TO_CURRENCY[code]) {
      return COUNTRY_TO_CURRENCY[code];
    }
    if (code && EU_COUNTRY_CODES.has(code)) return "EUR";
    return "USD";
  } catch {
    return detectCurrencyFromLocale();
  }
}

/** 1 AUD ≈ this many USD — kept for legacy custom-rate UI */
export const AUD_TO_USD_RATE = EXCHANGE_RATES.USD;
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

export function getExchangeRate(currency: CurrencyCode): number {
  if (currency === "USD") return getAudToUsdRate();
  return EXCHANGE_RATES[currency];
}

export function convertAudToCurrency(
  audAmount: number,
  currency: CurrencyCode,
): number {
  return Math.round(audAmount * getExchangeRate(currency));
}

export function convertCurrencyToAud(
  amount: number,
  currency: string,
): number {
  if (!isCurrencyCode(currency) || currency === "AUD") {
    return Math.round(amount);
  }
  const rate = getExchangeRate(currency);
  return Math.round(amount / rate);
}

export function audToUsd(aud: number, rate = getAudToUsdRate()): number {
  return Math.round(aud * rate);
}

export function usdToAud(usd: number, rate = getAudToUsdRate()): number {
  return Math.round(usd / rate);
}

export function formatPrice(audAmount: number, currency: string): string {
  const code = isCurrencyCode(currency) ? currency : "AUD";
  const rate = getExchangeRate(code);
  const converted = audAmount * rate;
  const symbol = CURRENCY_SYMBOLS[code];
  return `${symbol}${converted.toFixed(0)}`;
}

export function formatAUD(amount: number): string {
  return formatPrice(amount, "AUD");
}

export function formatUSD(amount: number): string {
  return formatPrice(amount, "USD");
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
