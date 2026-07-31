"use client";

export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  if (!!(window as any).Capacitor?.isNativePlatform?.()) return true;
  if ((window.navigator as any).standalone === true) return true;
  return false;
};
