import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { LegoSet, Recommendation } from "@/lib/analyze";
import { brickLinkGet } from "@/lib/bricklink-oauth";

const USD_TO_AUD = 1.55;
const BRICKLINK_BASE = "https://api.bricklink.com/api/store/v1";

export interface BrickLinkCatalogItem {
  no: string;
  name: string;
  type?: string;
  category_id?: number;
  categoryID?: number;
  category_name?: string;
  weight?: string | number;
  year_released?: number;
  is_obsolete?: boolean;
  avg_price?: string | number;
}

interface SetsFile {
  $comment?: string;
  sets: LegoSet[];
}

interface BrickLinkCategory {
  category_id?: number;
  categoryID?: number;
  category_name?: string;
}

export interface ImportBrickLinkResult {
  added: number;
  skipped: number;
  totalFetched: number;
}

function requireBrickLinkEnv(): void {
  const keys = [
    "BRICKLINK_CONSUMER_KEY",
    "BRICKLINK_CONSUMER_SECRET",
    "BRICKLINK_TOKEN_VALUE",
    "BRICKLINK_TOKEN_SECRET",
  ];
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing BrickLink env vars: ${missing.join(", ")}`);
  }
}

function normalizeSetNumber(itemNo: string): string {
  return itemNo.replace(/-1$/, "");
}

function parseNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCategoryId(item: BrickLinkCatalogItem): number | undefined {
  return item.category_id ?? item.categoryID;
}

export function getRecommendationForImport(input: {
  retired: boolean;
  retiringSoon: boolean;
  estimatedValue: number;
  theme: string;
}): { recommendation: Recommendation; reason: string } {
  const { retired, retiringSoon, estimatedValue, theme } = input;

  if (retiringSoon) {
    return {
      recommendation: "HOLD",
      reason: "Approaching retirement — hold for price appreciation",
    };
  }

  if (retired) {
    if (estimatedValue > 200) {
      return {
        recommendation: "SELL",
        reason: "Retired set with strong secondary market value",
      };
    }
    if (estimatedValue > 100) {
      return {
        recommendation: "SELL",
        reason: "Retired set with consistent collector demand",
      };
    }
    if (estimatedValue > 50) {
      return {
        recommendation: "SELL",
        reason: "Retired set with modest collector demand",
      };
    }
    return {
      recommendation: "HOLD",
      reason: `Retired ${theme} set — monitor secondary market pricing`,
    };
  }

  return {
    recommendation: "HOLD",
    reason: "Currently available at retail — monitor for retirement",
  };
}

export function brickLinkItemToLegoSet(
  item: BrickLinkCatalogItem,
  categoryNames: Map<number, string>,
): LegoSet {
  const categoryId = getCategoryId(item);
  const theme =
    item.category_name ??
    (categoryId !== undefined ? categoryNames.get(categoryId) : undefined) ??
    "Unknown";

  const avgPriceUsd = parseNumber(item.avg_price);
  const estimatedValue = Math.round(avgPriceUsd * USD_TO_AUD);
  const suggestedListPrice = Math.round(estimatedValue * 1.1);
  const retired = Boolean(item.is_obsolete);
  const retiringSoon = false;
  const { recommendation, reason } = getRecommendationForImport({
    retired,
    retiringSoon,
    estimatedValue,
    theme,
  });

  const pieces = Math.round(parseNumber(item.weight)) || 0;
  const today = new Date().toISOString().slice(0, 10);

  return {
    number: normalizeSetNumber(item.no),
    name: item.name,
    theme,
    year: item.year_released ?? 0,
    pieces,
    msrp: 0,
    retired,
    retiringSoon,
    lastUpdated: today,
    dataSource: "BrickLink API",
    pricing: {
      sealed: { estimatedValue, trend: "stable" },
      complete: {
        estimatedValue: Math.round(estimatedValue * 0.7),
        trend: "stable",
      },
      incomplete: {
        estimatedValue: Math.round(estimatedValue * 0.4),
        trend: "falling",
      },
    },
    analysis: {
      sealed: {
        estimatedValue,
        recommendedListPrice: suggestedListPrice,
        recommendation,
        reasoning: reason,
      },
    },
  };
}

async function fetchBrickLinkJson<T>(url: string): Promise<T> {
  const response = await brickLinkGet(url);
  const json = (await response.json()) as {
    meta?: { code?: number | string; message?: string };
    data?: T;
  };

  const code = Number(json.meta?.code ?? response.status);
  if (!response.ok || (code && code >= 400)) {
    throw new Error(
      json.meta?.message ?? `BrickLink request failed (${response.status})`,
    );
  }

  return json.data as T;
}

async function fetchCategoryNameMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const categories = await fetchBrickLinkJson<BrickLinkCategory[]>(
      `${BRICKLINK_BASE}/categories`,
    );
    for (const category of categories ?? []) {
      const id = category.category_id ?? category.categoryID;
      if (id !== undefined && category.category_name) {
        map.set(id, category.category_name);
      }
    }
  } catch (error) {
    console.warn("Could not load BrickLink categories:", error);
  }
  return map;
}

function extractItemsFromResponse(data: unknown): BrickLinkCatalogItem[] {
  if (Array.isArray(data)) return data as BrickLinkCatalogItem[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items as BrickLinkCatalogItem[];
    }
  }
  return [];
}

export async function fetchAllBrickLinkSets(): Promise<BrickLinkCatalogItem[]> {
  const items: BrickLinkCatalogItem[] = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const url = `${BRICKLINK_BASE}/items/set?type=S&page=${page}&page_size=${pageSize}`;
    const data = await fetchBrickLinkJson<unknown>(url);
    const batch = extractItemsFromResponse(data);

    if (batch.length === 0) break;
    items.push(...batch);

    if (batch.length < pageSize) break;
    page += 1;
    if (page > 200) break;
  }

  return items;
}

export async function importBrickLinkSets(options?: {
  setsFilePath?: string;
}): Promise<ImportBrickLinkResult> {
  requireBrickLinkEnv();

  const setsFilePath =
    options?.setsFilePath ?? resolve(process.cwd(), "data/sets.json");

  const raw = readFileSync(setsFilePath, "utf8");
  const setsFile = JSON.parse(raw) as SetsFile;
  const existingNumbers = new Set(setsFile.sets.map((set) => set.number));

  const [brickLinkItems, categoryNames] = await Promise.all([
    fetchAllBrickLinkSets(),
    fetchCategoryNameMap(),
  ]);

  let added = 0;
  let skipped = 0;

  for (const item of brickLinkItems) {
    if (!item?.no || !item?.name) continue;

    const setNumber = normalizeSetNumber(item.no);
    if (existingNumbers.has(setNumber)) {
      skipped += 1;
      continue;
    }

    setsFile.sets.push(brickLinkItemToLegoSet(item, categoryNames));
    existingNumbers.add(setNumber);
    added += 1;
  }

  writeFileSync(setsFilePath, `${JSON.stringify(setsFile, null, 2)}\n`, "utf8");

  return {
    added,
    skipped,
    totalFetched: brickLinkItems.length,
  };
}
