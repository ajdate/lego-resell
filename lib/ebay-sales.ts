/**
 * eBay market / sold-listings integration helpers.
 * Live Browse API returns active listings; sold comps use mock data until
 * Marketplace Insights or sold-listings scope is approved.
 */

import { convertCurrencyToAud, EXCHANGE_RATES } from "@/src/lib/currency";

export type EbayListingCondition =
  | "NEW"
  | "USED"
  | "NEW_OTHER"
  | "USED_EXCELLENT"
  | "USED_VERY_GOOD"
  | "USED_GOOD"
  | "USED_ACCEPTABLE"
  | "UNKNOWN";

export interface EbaySaleListing {
  id: string;
  title: string;
  /** Price in AUD (catalogue base currency) */
  priceAud: number;
  currency: string;
  condition: EbayListingCondition;
  conditionLabel: string;
  soldDate: string | null;
  itemUrl: string;
  /** true when from estimated mock data */
  isEstimated: boolean;
}

export interface EbaySalesResponse {
  setNumber: string;
  configured: boolean;
  mock: boolean;
  source: "ebay_browse" | "estimated";
  marketplace: string;
  listings: EbaySaleListing[];
  /** Mean price of filtered active listings (AUD) */
  averageListedPriceAud?: number | null;
  /** Catalogue sealed estimate used for comparison (AUD) */
  catalogEstimatedValueAud?: number | null;
  fetchedAt: string;
  message?: string;
}

/** Title keywords that usually indicate accessories, not complete sets */
const ACCESSORY_TITLE_KEYWORDS = [
  "light kit",
  "lights kit",
  "sticker",
  "instructions only",
  "manual only",
  "minifigure",
  "minifig only",
  "bag",
  "parts only",
  "spare",
] as const;

const MIN_LISTING_PRICE_AUD = 50;
const MAX_LISTING_PRICE_AUD = 5000;

export function isAccessoryListing(title: string): boolean {
  const lower = title.toLowerCase();
  return ACCESSORY_TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function filterCompleteSetListings(
  listings: EbaySaleListing[],
): EbaySaleListing[] {
  return listings
    .filter(
      (l) =>
        l.priceAud >= MIN_LISTING_PRICE_AUD &&
        l.priceAud <= MAX_LISTING_PRICE_AUD &&
        !isAccessoryListing(l.title),
    )
    .slice(0, 10);
}

export function averageListedPriceAud(
  listings: EbaySaleListing[],
): number | null {
  if (listings.length === 0) return null;
  const sum = listings.reduce((acc, l) => acc + l.priceAud, 0);
  return Math.round(sum / listings.length);
}

const EBAY_APP_ID = process.env.EBAY_APP_ID ?? "";
const EBAY_CERT_ID = process.env.EBAY_CERT_ID ?? "";
const EBAY_SANDBOX = process.env.EBAY_SANDBOX === "true";

export function isEbayConfigured(): boolean {
  return Boolean(EBAY_APP_ID && EBAY_CERT_ID);
}

function ebayApiBase(): string {
  return EBAY_SANDBOX
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
}

export type EbayRegion = "AU" | "US" | "UK";

export function ebayMarketplaceConfig(region: EbayRegion = "AU") {
  switch (region) {
    case "US":
      return {
        marketplaceId: "EBAY_US",
        locationCountry: "US",
        siteId: "0",
        domain: "ebay.com",
        label: "EBAY_US",
      };
    case "UK":
      return {
        marketplaceId: "EBAY_GB",
        locationCountry: "GB",
        siteId: "3",
        domain: "ebay.co.uk",
        label: "EBAY_GB",
      };
    default:
      return {
        marketplaceId: "EBAY_AU",
        locationCountry: "AU",
        siteId: "15",
        domain: "ebay.com.au",
        label: "EBAY_AU",
      };
  }
}

export function ebaySearchQuery(setNumber: string): string {
  return `LEGO ${setNumber} complete set`;
}

function priceFilterForRegion(region: EbayRegion): string {
  if (region === "US") {
    const min = Math.round(MIN_LISTING_PRICE_AUD * EXCHANGE_RATES.USD);
    const max = Math.round(MAX_LISTING_PRICE_AUD * EXCHANGE_RATES.USD);
    return `price:[${min}..${max}]`;
  }
  if (region === "UK") {
    const min = Math.round(MIN_LISTING_PRICE_AUD * EXCHANGE_RATES.GBP);
    const max = Math.round(MAX_LISTING_PRICE_AUD * EXCHANGE_RATES.GBP);
    return `price:[${min}..${max}]`;
  }
  return `price:[${MIN_LISTING_PRICE_AUD}..${MAX_LISTING_PRICE_AUD}]`;
}

export function ebaySoldSearchUrl(
  setNumber: string,
  region: EbayRegion = "AU",
): string {
  const q = encodeURIComponent(ebaySearchQuery(setNumber));
  const { domain } = ebayMarketplaceConfig(region);
  return `https://www.${domain}/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
}

export function ebayActiveSearchUrl(
  setNumber: string,
  region: EbayRegion = "AU",
): string {
  const q = encodeURIComponent(ebaySearchQuery(setNumber));
  const { domain } = ebayMarketplaceConfig(region);
  const min = region === "US"
    ? Math.round(MIN_LISTING_PRICE_AUD * EXCHANGE_RATES.USD)
    : region === "UK"
      ? Math.round(MIN_LISTING_PRICE_AUD * EXCHANGE_RATES.GBP)
      : MIN_LISTING_PRICE_AUD;
  return `https://www.${domain}/sch/i.html?_nkw=${q}&LH_BIN=1&_udlo=${min}`;
}

export function conditionLabelFromEbay(
  condition: string | undefined,
): string {
  switch (condition) {
    case "NEW":
      return "New / Sealed";
    case "NEW_OTHER":
      return "New (other)";
    case "USED":
    case "USED_EXCELLENT":
      return "Used — Excellent";
    case "USED_VERY_GOOD":
      return "Used — Very Good";
    case "USED_GOOD":
      return "Used — Good";
    case "USED_ACCEPTABLE":
      return "Used — Acceptable";
    default:
      return "Used";
  }
}

/** Deterministic pseudo-random from set number for stable mock data */
function seedFromSet(setNumber: string): number {
  let h = 0;
  for (let i = 0; i < setNumber.length; i++) {
    h = (h * 31 + setNumber.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 9999 + index * 7919) * 10000;
  return x - Math.floor(x);
}

/**
 * Estimated sold comps when API keys are not configured (or as fallback).
 */
export function buildMockSoldListings(
  setNumber: string,
  estimatedValueAud: number,
): EbaySaleListing[] {
  const seed = seedFromSet(setNumber);
  const templates: { label: string; condition: EbayListingCondition; mult: [number, number] }[] = [
    { label: "New / Sealed", condition: "NEW", mult: [1.0, 1.1] },
    { label: "New / Sealed", condition: "NEW", mult: [0.98, 1.05] },
    { label: "Used — Excellent", condition: "USED_EXCELLENT", mult: [0.72, 0.78] },
    { label: "Used — Very Good", condition: "USED_VERY_GOOD", mult: [0.68, 0.74] },
    { label: "Damaged box", condition: "USED_GOOD", mult: [0.58, 0.64] },
    { label: "Incomplete", condition: "USED_ACCEPTABLE", mult: [0.38, 0.44] },
  ];

  const now = Date.now();
  return templates.map((t, i) => {
    const r = seededRandom(seed, i);
    const low = estimatedValueAud * t.mult[0];
    const high = estimatedValueAud * t.mult[1];
    const priceAud = Math.round(low + r * (high - low));
    const daysAgo = Math.floor(seededRandom(seed, i + 10) * 28) + 1;
    const soldDate = new Date(now - daysAgo * 86400000).toISOString();

    return {
      id: `mock-${setNumber}-${i}`,
      title: `LEGO ${setNumber} — ${t.label} (estimated comp)`,
      priceAud,
      currency: "AUD",
      condition: t.condition,
      conditionLabel: t.label,
      soldDate,
      itemUrl: ebaySoldSearchUrl(setNumber),
      isEstimated: true,
    };
  });
}

interface EbayBrowseItemSummary {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  condition?: string;
  conditionId?: string;
  itemEndDate?: string;
  itemWebUrl?: string;
}

interface EbayBrowseSearchResponse {
  itemSummaries?: EbayBrowseItemSummary[];
  total?: number;
}

function parsePriceAud(item: EbayBrowseItemSummary): number {
  const value = parseFloat(item.price?.value ?? "0");
  const currency = item.price?.currency ?? "AUD";
  return convertCurrencyToAud(value, currency);
}

export function normalizeBrowseListings(
  items: EbayBrowseItemSummary[],
  setNumber: string,
  region: EbayRegion = "AU",
): EbaySaleListing[] {
  return items.map((item, index) => ({
    id: item.itemId ?? `ebay-${setNumber}-${index}`,
    title: item.title ?? `LEGO ${setNumber}`,
    priceAud: parsePriceAud(item),
    currency: item.price?.currency ?? "AUD",
    condition: (item.condition as EbayListingCondition) ?? "UNKNOWN",
    conditionLabel: conditionLabelFromEbay(item.condition),
    soldDate: null,
    itemUrl: item.itemWebUrl ?? ebayActiveSearchUrl(setNumber, region),
    isEstimated: false,
  }));
}

export async function getEbayAccessToken(): Promise<string> {
  if (!isEbayConfigured()) {
    throw new Error("eBay API keys not configured");
  }

  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString(
    "base64",
  );
  const response = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    cache: "no-store",
  });

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Failed to obtain eBay access token",
    );
  }

  return data.access_token;
}

export async function searchEbayMarketListings(
  setNumber: string,
  token: string,
  region: EbayRegion = "AU",
): Promise<EbaySaleListing[]> {
  const { marketplaceId, locationCountry } = ebayMarketplaceConfig(region);
  const query = encodeURIComponent(ebaySearchQuery(setNumber));
  const filter = encodeURIComponent(
    [
      "buyingOptions:{FIXED_PRICE}",
      "conditions:{NEW|USED}",
      `itemLocationCountry:${locationCountry}`,
      priceFilterForRegion(region),
    ].join(","),
  );

  const response = await fetch(
    `${ebayApiBase()}/buy/browse/v1/item_summary/search?q=${query}&filter=${filter}&sort=-price&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  const data = (await response.json()) as EbayBrowseSearchResponse & {
    errors?: { message?: string }[];
  };

  if (!response.ok) {
    const msg =
      data.errors?.[0]?.message ?? `eBay Browse API error (${response.status})`;
    throw new Error(msg);
  }

  const normalized = normalizeBrowseListings(
    data.itemSummaries ?? [],
    setNumber,
    region,
  );
  return filterCompleteSetListings(normalized);
}

export function buildEbaySalesResponse(
  setNumber: string,
  listings: EbaySaleListing[],
  options: {
    configured: boolean;
    mock: boolean;
    source: EbaySalesResponse["source"];
    message?: string;
    catalogEstimatedValueAud?: number | null;
    region?: EbayRegion;
  },
): EbaySalesResponse {
  const filtered =
    options.source === "estimated"
      ? listings
      : filterCompleteSetListings(listings);
  const region = options.region ?? "AU";

  return {
    setNumber,
    configured: options.configured,
    mock: options.mock,
    source: options.source,
    marketplace: ebayMarketplaceConfig(region).label,
    listings: filtered,
    averageListedPriceAud: averageListedPriceAud(filtered),
    catalogEstimatedValueAud: options.catalogEstimatedValueAud ?? null,
    fetchedAt: new Date().toISOString(),
    message: options.message,
  };
}
