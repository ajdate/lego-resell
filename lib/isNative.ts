"use client";

export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  if (!!(window as any).Capacitor?.isNativePlatform?.()) return true;
  if ((window.navigator as any).standalone === true) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "ios-app") return true;
  } catch {}
  return false;
};
