import crypto from "crypto";
import { NextRequest } from "next/server";

function generateOAuthHeader(method: string, url: string) {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY!;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET!;
  const tokenValue = process.env.BRICKLINK_TOKEN_VALUE!;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  const allParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: tokenValue,
    oauth_version: "1.0",
  };

  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const signatureBaseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBaseString)
    .digest("base64");

  const oauthHeader = [
    `oauth_consumer_key="${percentEncode(consumerKey)}"`,
    `oauth_nonce="${percentEncode(nonce)}"`,
    `oauth_signature="${percentEncode(signature)}"`,
    `oauth_signature_method="HMAC-SHA1"`,
    `oauth_timestamp="${timestamp}"`,
    `oauth_token="${percentEncode(tokenValue)}"`,
    `oauth_version="1.0"`,
  ].join(", ");

  return `OAuth ${oauthHeader}`;
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

async function fetchBricklinkPrice(setNumber: string, condition: "N" | "U") {
  const url = `https://api.bricklink.com/api/store/v1/items/set/${setNumber}/price?guide_type=sold&new_or_used=${condition}`;

  const authHeader = generateOAuthHeader("GET", url);

  const response = await fetch(url, {
    headers: {
      Authorization: authHeader,
    },
    cache: "no-store",
  });

  return response.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber");

  if (!setNumber) {
    return Response.json({ error: "Set number required" }, { status: 400 });
  }

  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  try {
    const [dataNew, dataUsed] = await Promise.all([
      fetchBricklinkPrice(blSetNumber, "N"),
      fetchBricklinkPrice(blSetNumber, "U"),
    ]);

    console.log("BrickLink sealed:", JSON.stringify(dataNew));
    console.log("BrickLink used:", JSON.stringify(dataUsed));

    return Response.json({
      setNumber,
      sealed: {
        avgPrice: dataNew?.data?.avg_price ?? null,
        minPrice: dataNew?.data?.min_price ?? null,
        maxPrice: dataNew?.data?.max_price ?? null,
        qtySold: dataNew?.data?.unit_quantity ?? null,
        totalQty: dataNew?.data?.total_quantity ?? null,
      },
      used: {
        avgPrice: dataUsed?.data?.avg_price ?? null,
        minPrice: dataUsed?.data?.min_price ?? null,
        maxPrice: dataUsed?.data?.max_price ?? null,
        qtySold: dataUsed?.data?.unit_quantity ?? null,
        totalQty: dataUsed?.data?.total_quantity ?? null,
      },
      debug: {
        sealedMeta: dataNew?.meta,
        usedMeta: dataUsed?.meta,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("BrickLink error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
