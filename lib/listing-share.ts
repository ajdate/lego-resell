import {
  listingTextForTab,
  type ListingFormatsResponse,
} from "@/lib/listing-formats";

export const LEGO_SHARES_KEY = "lego-shares";

export type SharePlatform = "ebay" | "marketplace" | "analysis";

export type ShareRecord = {
  setNumber: string;
  platform: SharePlatform;
  date: string;
};

export function recordListingShare(
  setNumber: string,
  platform: SharePlatform,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LEGO_SHARES_KEY);
    const existing = raw ? (JSON.parse(raw) as ShareRecord[]) : [];
    const list = Array.isArray(existing) ? existing : [];
    list.push({
      setNumber: setNumber.trim(),
      platform,
      date: new Date().toISOString(),
    });
    localStorage.setItem(LEGO_SHARES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getListingTextForTab(
  listings: ListingFormatsResponse,
  tab: "marketplace" | "ebay",
): string {
  return listingTextForTab(listings, tab);
}

export type ShareResult = "shared" | "copied" | "cancelled";

export async function shareWithNativeOrClipboard(options: {
  title: string;
  text: string;
  url?: string;
  /** Desktop fallback clipboard body (defaults to text + url when url provided) */
  clipboardText?: string;
}): Promise<ShareResult> {
  const shareUrl =
    options.url ??
    (typeof window !== "undefined" ? window.location.href : undefined);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: shareUrl,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const clipboardBody =
    options.clipboardText ??
    (shareUrl ? `${options.text}\n\n${shareUrl}` : options.text);
  await navigator.clipboard.writeText(clipboardBody);
  return "copied";
}
