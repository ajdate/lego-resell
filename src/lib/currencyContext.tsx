"use client";

// Future: replace Intl-based detection with IP geolocation API
// for more accurate results, especially for VPN users.
// Recommended: ipapi.co/json or cloudflare workers geo headers.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AUD_TO_USD_RATE,
  audToUsd,
  CURRENCY_NOTICE_DISMISSED_KEY,
  CURRENCY_PREFERENCE_KEY,
  CUSTOM_EXCHANGE_RATE_KEY,
  detectCurrencyFromLocale,
  formatAUD,
  formatBoth,
  formatUSD,
  getAudToUsdRate,
  getLocationPricingNote,
  getRegionalContext,
  usdToAud,
  type CurrencyCode,
} from "@/src/lib/currency";

export type { CurrencyCode };

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  isManuallyOverridden: boolean;
  resetToAutoDetect: () => void;
  dismissLocationNotice: () => void;
  isLocationNoticeDismissed: boolean;
  locationPricingNote: string;
  regionalContext: string;
  audToUsdRate: number;
  hasCustomRate: boolean;
  setCustomExchangeRate: (rate: number) => void;
  resetCustomExchangeRate: () => void;
  formatPrice: (audAmount: number) => string;
  formatPriceSecondary: (audAmount: number) => string;
  formatDualLine: (audAmount: number) => string;
  formatBothPrices: (audAmount: number) => { aud: string; usd: string };
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readSavedPreference(): CurrencyCode | null {
  if (typeof window === "undefined") return null;
  try {
    const pref = localStorage.getItem(CURRENCY_PREFERENCE_KEY);
    if (pref === "USD" || pref === "AUD") return pref;
  } catch {
    /* ignore */
  }
  return null;
}

function readNoticeDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CURRENCY_NOTICE_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("AUD");
  const [isManuallyOverridden, setIsManuallyOverridden] = useState(false);
  const [isLocationNoticeDismissed, setIsLocationNoticeDismissed] =
    useState(true);
  const [audToUsdRate, setAudToUsdRate] = useState(AUD_TO_USD_RATE);
  const [hasCustomRate, setHasCustomRate] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refreshRate = useCallback(() => {
    setAudToUsdRate(getAudToUsdRate());
    try {
      setHasCustomRate(
        Boolean(localStorage.getItem(CUSTOM_EXCHANGE_RATE_KEY)),
      );
    } catch {
      setHasCustomRate(false);
    }
  }, []);

  const applyAutoDetect = useCallback(() => {
    const detected = detectCurrencyFromLocale();
    setCurrencyState(detected);
    setIsManuallyOverridden(false);
    return detected;
  }, []);

  useEffect(() => {
    const saved = readSavedPreference();
    if (saved) {
      setCurrencyState(saved);
      setIsManuallyOverridden(true);
    } else {
      applyAutoDetect();
    }
    setIsLocationNoticeDismissed(readNoticeDismissed());
    refreshRate();
    setHydrated(true);
  }, [applyAutoDetect, refreshRate]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    setIsManuallyOverridden(true);
    try {
      localStorage.setItem(CURRENCY_PREFERENCE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const resetToAutoDetect = useCallback(() => {
    try {
      localStorage.removeItem(CURRENCY_PREFERENCE_KEY);
    } catch {
      /* ignore */
    }
    applyAutoDetect();
  }, [applyAutoDetect]);

  const dismissLocationNotice = useCallback(() => {
    setIsLocationNoticeDismissed(true);
    try {
      localStorage.setItem(CURRENCY_NOTICE_DISMISSED_KEY, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const setCustomExchangeRate = useCallback(
    (rate: number) => {
      if (!Number.isFinite(rate) || rate <= 0) return;
      try {
        localStorage.setItem(CUSTOM_EXCHANGE_RATE_KEY, String(rate));
      } catch {
        /* ignore */
      }
      refreshRate();
    },
    [refreshRate],
  );

  const resetCustomExchangeRate = useCallback(() => {
    try {
      localStorage.removeItem(CUSTOM_EXCHANGE_RATE_KEY);
    } catch {
      /* ignore */
    }
    refreshRate();
  }, [refreshRate]);

  const formatPrice = useCallback(
    (audAmount: number) => {
      if (!hydrated) return formatAUD(audAmount);
      if (currency === "AUD") return formatAUD(audAmount);
      return formatUSD(audToUsd(audAmount, audToUsdRate));
    },
    [currency, audToUsdRate, hydrated],
  );

  const formatPriceSecondary = useCallback(
    (audAmount: number) => {
      if (currency === "AUD") {
        return `≈ ${formatUSD(audToUsd(audAmount, audToUsdRate))}`;
      }
      return `≈ ${formatAUD(audAmount)}`;
    },
    [currency, audToUsdRate],
  );

  const formatDualLine = useCallback(
    (audAmount: number) => {
      const both = formatBoth(audAmount, audToUsdRate);
      return `${both.aud} / ${both.usd}`;
    },
    [audToUsdRate],
  );

  const formatBothPrices = useCallback(
    (audAmount: number) => formatBoth(audAmount, audToUsdRate),
    [audToUsdRate],
  );

  const locationPricingNote = useMemo(
    () => getLocationPricingNote(currency, isManuallyOverridden),
    [currency, isManuallyOverridden],
  );

  const regionalContext = useMemo(
    () => getRegionalContext(currency),
    [currency],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      isManuallyOverridden,
      resetToAutoDetect,
      dismissLocationNotice,
      isLocationNoticeDismissed,
      locationPricingNote,
      regionalContext,
      audToUsdRate,
      hasCustomRate,
      setCustomExchangeRate,
      resetCustomExchangeRate,
      formatPrice,
      formatPriceSecondary,
      formatDualLine,
      formatBothPrices,
    }),
    [
      currency,
      setCurrency,
      isManuallyOverridden,
      resetToAutoDetect,
      dismissLocationNotice,
      isLocationNoticeDismissed,
      locationPricingNote,
      regionalContext,
      audToUsdRate,
      hasCustomRate,
      setCustomExchangeRate,
      resetCustomExchangeRate,
      formatPrice,
      formatPriceSecondary,
      formatDualLine,
      formatBothPrices,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}
