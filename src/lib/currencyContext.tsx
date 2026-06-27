"use client";

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
  BRICKVALUE_CURRENCY_KEY,
  CURRENCY_NOTICE_DISMISSED_KEY,
  CURRENCY_PREFERENCE_KEY,
  CUSTOM_EXCHANGE_RATE_KEY,
  detectUserCurrency,
  formatAUD,
  formatBoth,
  formatPrice as formatPriceLib,
  formatUSD,
  getAudToUsdRate,
  getLocationPricingNote,
  getRegionalContext,
  isCurrencyCode,
  usdToAud,
  type CurrencyCode,
} from "@/src/lib/currency";

export type { CurrencyCode };

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode | string) => void;
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
  isHydrated: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readSavedPreference(): CurrencyCode | null {
  if (typeof window === "undefined") return null;
  try {
    for (const key of [BRICKVALUE_CURRENCY_KEY, CURRENCY_PREFERENCE_KEY]) {
      const pref = localStorage.getItem(key);
      if (pref && isCurrencyCode(pref)) return pref;
    }
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
  const [audToUsdRate, setAudToUsdRate] = useState<number>(AUD_TO_USD_RATE);
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

  const applyAutoDetect = useCallback(async () => {
    const detected = await detectUserCurrency();
    setCurrencyState(detected);
    setIsManuallyOverridden(false);
    return detected;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const saved = readSavedPreference();
      if (saved) {
        if (!cancelled) {
          setCurrencyState(saved);
          setIsManuallyOverridden(true);
        }
      } else {
        // Set AUD immediately, detect in background
        if (!cancelled) setCurrencyState('AUD');
        detectUserCurrency().then(detected => {
          if (!cancelled) {
            setCurrencyState(detected);
            setIsManuallyOverridden(false);
          }
        }).catch(() => {});
      }

      if (!cancelled) {
        setIsLocationNoticeDismissed(readNoticeDismissed());
        refreshRate();
        setHydrated(true);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [refreshRate]);

  const setCurrency = useCallback((code: CurrencyCode | string) => {
    if (!isCurrencyCode(code)) return;
    setCurrencyState(code);
    setIsManuallyOverridden(true);
    try {
      localStorage.setItem(BRICKVALUE_CURRENCY_KEY, code);
      localStorage.removeItem(CURRENCY_PREFERENCE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const resetToAutoDetect = useCallback(() => {
    try {
      localStorage.removeItem(BRICKVALUE_CURRENCY_KEY);
      localStorage.removeItem(CURRENCY_PREFERENCE_KEY);
    } catch {
      /* ignore */
    }
    void applyAutoDetect();
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
      return formatPriceLib(audAmount, currency);
    },
    [currency, hydrated],
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
      const primary = formatPriceLib(audAmount, currency);
      const secondary =
        currency === "AUD"
          ? formatUSD(audToUsd(audAmount, audToUsdRate))
          : formatAUD(audAmount);
      return `${primary} / ${secondary}`;
    },
    [currency, audToUsdRate],
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
      isHydrated: hydrated,
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
      hydrated,
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

export { CURRENCY_LABELS, CURRENCY_SYMBOLS } from "@/src/lib/currency";
