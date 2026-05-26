export const TALLY_WAITLIST_URL = "https://tally.so/r/eqYleO";

export const WAITLIST_SESSION_KEY = "lego-waitlist-shown";

export function hasWaitlistBeenShown(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(WAITLIST_SESSION_KEY) === "true";
  } catch {
    return true;
  }
}

export function markWaitlistShown(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WAITLIST_SESSION_KEY, "true");
  } catch {
    /* ignore */
  }
}

export function openWaitlistInNewTab(): void {
  window.open(TALLY_WAITLIST_URL, "_blank", "noopener,noreferrer");
}
