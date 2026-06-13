import { NextRequest } from "next/server";
import crypto from "crypto";

function escape(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function generateOAuth(
  method: string,
  baseUrl: string,
  queryParams: Record<string, string>,
) {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY!;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET!;
  const tokenKey = process.env.BRICKLINK_TOKEN_VALUE!;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET!;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: tokenKey,
    oauth_version: "1.0",
  };

  const allParams: Record<string, string> = {
    ...queryParams,
    ...oauthParams,
  };

  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${escape(k)}=${escape(allParams[k])}`)
    .join("&");

  const signatureBase = `${method}&${escape(baseUrl)}&${escape(paramString)}`;

  const signingKey = `${escape(consumerSecret)}&${escape(tokenSecret)}`;

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${escape(k)}="${escape(oauthParams[k])}"`)
      .join(",");

  return authHeader;
}

async function getPrice(setNumber: string, condition: "N" | "U") {
  const baseUrl = `https://api.bricklink.com/api/store/v1/items/set/${setNumber}/price`;
  const queryParams: Record<string, string> = {
    guide_type: "sold",
    new_or_used: condition,
  };

  const queryString = Object.keys(queryParams)
    .map((k) => `${k}=${queryParams[k]}`)
    .join("&");

  const fullUrl = `${baseUrl}?${queryString}`;
  const authHeader = generateOAuth("GET", baseUrl, queryParams);

  const res = await fetch(fullUrl, {
    headers: {
      Authorization: authHeader,
    },
  });

  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber") || "75192";
  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  try {
    const [sealedData, usedData] = await Promise.all([
      getPrice(blSetNumber, "N"),
      getPrice(blSetNumber, "U"),
    ]);

    return Response.json({
      setNumber,
      sealed: {
        avgPrice: sealedData?.data?.avg_price ?? null,
        minPrice: sealedData?.data?.min_price ?? null,
        maxPrice: sealedData?.data?.max_price ?? null,
        qtySold: sealedData?.data?.unit_quantity ?? null,
      },
      used: {
        avgPrice: usedData?.data?.avg_price ?? null,
        minPrice: usedData?.data?.min_price ?? null,
        maxPrice: usedData?.data?.max_price ?? null,
        qtySold: usedData?.data?.unit_quantity ?? null,
      },
      debug: {
        sealedMeta: sealedData?.meta,
        usedMeta: usedData?.meta,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
