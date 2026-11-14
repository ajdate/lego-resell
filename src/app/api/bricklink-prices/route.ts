import { NextRequest } from "next/server";
import crypto from "crypto";

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
  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;
  const requested = searchParams.get("region") as BrickLinkRegion | null;
  const region: BrickLinkRegion =
    requested && requested in BRICKLINK_REGION_PARAMS ? requested : "world";

  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY!;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET!;
  const tokenKey = process.env.BRICKLINK_TOKEN_VALUE!;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET!;

  /** BrickLink sometimes refuses a request; retry with short pauses. */
  async function fetchBLPrice(condition: "N" | "U", scope: BrickLinkRegion) {
    let result = await fetchBLPriceOnce(condition, scope);
    for (const pause of [500, 1200]) {
      if (result?.meta?.code === 200) break;
      await new Promise((r) => setTimeout(r, pause));
      result = await fetchBLPriceOnce(condition, scope);
    }
    return result;
  }

  async function fetchBLPriceOnce(condition: "N" | "U", scope: BrickLinkRegion) {
    const method = "GET";
    const baseUrl = `https://api.bricklink.com/api/store/v1/items/set/${blSetNumber}/price`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(8).toString("hex");

    const queryParams: Record<string, string> = {
      guide_type: "sold",
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
    if (
      region === "world" ||
      regional?.meta?.code !== 200 ||
      (regional?.data?.unit_quantity ?? 0) >= MIN_REGIONAL_SALES
    ) {
      return toBand(regional, false);
    }
    return toBand(await fetchBLPrice(condition, "world"), true);
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
