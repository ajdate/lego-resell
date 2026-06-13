import { NextRequest } from "next/server";
import crypto from "crypto";

function generateOAuthHeader(method: string, url: string) {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY!;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET!;
  const tokenKey = process.env.BRICKLINK_TOKEN_VALUE!;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(8).toString("hex");

  const urlObj = new URL(url);
  const queryParams: Record<string, string> = {};
  urlObj.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

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

  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  const signatureBase = `${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${consumerSecret}&${tokenSecret}`;

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  return `OAuth oauth_consumer_key="${consumerKey}",oauth_token="${tokenKey}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${timestamp}",oauth_nonce="${nonce}",oauth_version="1.0",oauth_signature="${signature}"`;
}

async function fetchPrice(setNumber: string, condition: "N" | "U") {
  const url = `https://api.bricklink.com/api/store/v1/items/set/${setNumber}/price?guide_type=sold&new_or_used=${condition}`;
  const authHeader = generateOAuthHeader("GET", url);
  const res = await fetch(url, { headers: { Authorization: authHeader } });
  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber") || "75192";
  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  try {
    const [sealedData, usedData] = await Promise.all([
      fetchPrice(blSetNumber, "N"),
      fetchPrice(blSetNumber, "U"),
    ]);

    const usdToAud = 1.55;

    const convertPrice = (usdPrice: string | null) =>
      usdPrice ? (parseFloat(usdPrice) * usdToAud).toFixed(2) : null;

    return Response.json({
      setNumber,
      currency: "AUD",
      sealed: {
        avgPrice: convertPrice(sealedData?.data?.avg_price),
        minPrice: convertPrice(sealedData?.data?.min_price),
        maxPrice: convertPrice(sealedData?.data?.max_price),
        qtySold: sealedData?.data?.unit_quantity ?? null,
        totalQty: sealedData?.data?.total_quantity ?? null,
      },
      used: {
        avgPrice: convertPrice(usedData?.data?.avg_price),
        minPrice: convertPrice(usedData?.data?.min_price),
        maxPrice: convertPrice(usedData?.data?.max_price),
        qtySold: usedData?.data?.unit_quantity ?? null,
        totalQty: usedData?.data?.total_quantity ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
