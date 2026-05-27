export interface EbayListingFormat {
  title: string;
  description: string;
}

export interface MarketplaceListingFormat {
  description: string;
}

export interface ListingFormatsResponse {
  ebay: EbayListingFormat;
  marketplace: MarketplaceListingFormat;
}

export function isListingFormatsResponse(
  value: unknown,
): value is ListingFormatsResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const ebay = v.ebay as Record<string, unknown> | undefined;
  const marketplace = v.marketplace as Record<string, unknown> | undefined;
  return (
    typeof ebay?.title === "string" &&
    typeof ebay?.description === "string" &&
    typeof marketplace?.description === "string"
  );
}

/** Fallback cleanup if the model returns stray markdown */
export function plainListingText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

export function ebayListingForClipboard(ebay: EbayListingFormat): string {
  return `${ebay.title}\n\n${ebay.description}`;
}
