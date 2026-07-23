export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();
};
