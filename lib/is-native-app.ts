"use client";

/**
 * Detects Capacitor/native iOS or Android shell.
 * Used to hide Stripe/external payment UI for App Store compliance.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}
