"use client";

export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;

  // Check Capacitor
  if (!!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.())
    return true;

  // Check URL parameter and save to localStorage
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("native") === "1") {
      localStorage.setItem("bv_native", "1");
      return true;
    }
  } catch {}

  // Check localStorage (persists across navigations)
  try {
    if (localStorage.getItem("bv_native") === "1") return true;
  } catch {}

  // Check standalone PWA
  if (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  )
    return true;

  return false;
};
