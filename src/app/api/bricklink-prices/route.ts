import { NextRequest } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber") || "75192";
  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY!;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET!;
  const tokenKey = process.env.BRICKLINK_TOKEN_VALUE!;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET!;

  async function fetchBLPrice(condition: "N" | "U") {
    const method = "GET";
    const baseUrl = `https://api.bricklink.com/api/store/v1/items/set/${blSetNumber}/price`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(8).toString("hex");

    const queryParams: Record<string, string> = {
      guide_type: "sold",
      new_or_used: condition,
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

  try {
    const [sealedData, usedData] = await Promise.all([
      fetchBLPrice("N"),
      fetchBLPrice("U"),
    ]);

    const usdToAud = 1.55;

    const convertPrice = (usdPrice: string | null | undefined) =>
      usdPrice ? (parseFloat(usdPrice) * usdToAud).toFixed(0) : null;

    return Response.json({
      setNumber,
      currency: "AUD",
      sealed: {
        avgPrice: convertPrice(sealedData?.data?.avg_price),
        minPrice: convertPrice(sealedData?.data?.min_price),
        maxPrice: convertPrice(sealedData?.data?.max_price),
        qtySold: sealedData?.data?.unit_quantity ?? null,
      },
      used: {
        avgPrice: convertPrice(usedData?.data?.avg_price),
        minPrice: convertPrice(usedData?.data?.min_price),
        maxPrice: convertPrice(usedData?.data?.max_price),
        qtySold: usedData?.data?.unit_quantity ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
