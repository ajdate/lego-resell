import { NextRequest } from "next/server";
import crypto from "crypto";
import { catalogItemId } from "@/lib/set-number";

import type { BrickLinkRegion } from "@/lib/bricklink-prices-client";

const BRICKLINK_REGION_PARAMS: Record<BrickLinkRegion, Record<string, string>> = {
  world: {},
  AU: { country_code: "AU" },
  north_america: { region: "north_america" },
  europe: { region: "europe" },
};

/** Below this many sales in the region, fall back to worldwide. */
const MIN_REGIONAL_SALES = 3;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber") || "75192";
  const blSetNumber = catalogItemId(setNumber);
  const requested = searchParams.get("region") as BrickLinkRegion | null;
  const region: BrickLinkRegion =
    requested && requested in BRICKLINK_REGION_PARAMS ? requested : "world";

  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY!;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET!;
  const tokenKey = process.env.BRICKLINK_TOKEN_VALUE!;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET!;

  /** BrickLink sometimes refuses a request; retry with short pauses. */
  async function fetchBLPrice(
    condition: "N" | "U",
    scope: BrickLinkRegion,
    guideType: "sold" | "stock" = "sold",
  ) {
    let result = await fetchBLPriceOnce(condition, scope, guideType);
    for (const pause of [500, 1200]) {
      if (result?.meta?.code === 200) break;
      await new Promise((r) => setTimeout(r, pause));
      result = await fetchBLPriceOnce(condition, scope, guideType);
    }
    return result;
  }

  async function fetchBLPriceOnce(
    condition: "N" | "U",
    scope: BrickLinkRegion,
    guideType: "sold" | "stock",
  ) {
    const method = "GET";
    const baseUrl = `https://api.bricklink.com/api/store/v1/items/set/${blSetNumber}/price`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(8).toString("hex");

    const queryParams: Record<string, string> = {
      guide_type: guideType,
      new_or_used: condition,
      currency_code: "AUD",
      ...BRICKLINK_REGION_PARAMS[scope],
    };

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_token: tokenKey,
      oauth_version: "1.0",
    };

    const allParams = { ...queryParams, ...oauthParams };

    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
      .join("&");

    const signatureBase = [
      method,
      encodeURIComponent(baseUrl),
      encodeURIComponent(paramString),
    ].join("&");

    const signingKey = `${consumerSecret}&${tokenSecret}`;

    const signature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBase)
      .digest("base64");

    const authHeader = `OAuth oauth_consumer_key="${consumerKey}",oauth_token="${tokenKey}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${timestamp}",oauth_nonce="${nonce}",oauth_version="1.0",oauth_signature="${signature}"`;

    const queryString = Object.keys(queryParams)
      .map((k) => `${k}=${queryParams[k]}`)
      .join("&");

    const fullUrl = `${baseUrl}?${queryString}`;

    const res = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    return res.json();
  }

  type BLGuide = {
    meta?: { code?: number };
    data?: {
      avg_price?: string;
      min_price?: string;
      max_price?: string;
      unit_quantity?: number;
    };
  };

  const toPrice = (v: string | undefined) =>
    v ? parseFloat(v).toFixed(0) : null;

  function toBand(guide: BLGuide, fallback: boolean) {
    return {
      avgPrice: toPrice(guide?.data?.avg_price),
      minPrice: toPrice(guide?.data?.min_price),
      maxPrice: toPrice(guide?.data?.max_price),
      qtySold: guide?.data?.unit_quantity ?? null,
      fallback,
      // false = BrickLink refused the request (not the same as no sales)
      ok: guide?.meta?.code === 200,
    };
  }

  /** Regional price, or worldwide when the region has too few recent sales. */
  async function band(condition: "N" | "U") {
    const regional: BLGuide = await fetchBLPrice(condition, region);
    const result =
      region === "world" ||
      regional?.meta?.code !== 200 ||
      (regional?.data?.unit_quantity ?? 0) >= MIN_REGIONAL_SALES
        ? toBand(regional, false)
        : toBand(await fetchBLPrice(condition, "world"), true);

    // Too few sales (BrickLink only reports the last 6 months): add current
    // worldwide listings as a clearly labelled last resort
    if (result.ok && (result.qtySold ?? 0) < MIN_REGIONAL_SALES) {
      const stock: BLGuide = await fetchBLPrice(condition, "world", "stock");
      return { ...result, listings: stock?.meta?.code === 200 ? toBand(stock, false) : null };
    }
    return result;
  }

  try {
    // One at a time: simultaneous requests are often rejected by BrickLink
    const sealed = await band("N");
    const used = await band("U");

    return Response.json({
      setNumber,
      currency: "AUD",
      region,
      sealed,
      used,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
