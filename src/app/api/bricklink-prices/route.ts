import { NextRequest } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET;
  const tokenKey = process.env.BRICKLINK_TOKEN_VALUE;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !tokenKey || !tokenSecret) {
    return Response.json({
      error: "Missing env vars",
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      hasTokenKey: !!tokenKey,
      hasTokenSecret: !!tokenSecret,
    });
  }

  const method = "GET";
  const baseUrl =
    "https://api.bricklink.com/api/store/v1/items/set/75192-1/price";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(8).toString("hex");

  const queryParams = {
    guide_type: "sold",
    new_or_used: "N",
  };

  const oauthParams = {
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
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k as keyof typeof allParams])}`,
    )
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

  const authHeader =
    "OAuth " +
    `oauth_consumer_key="${consumerKey}",` +
    `oauth_token="${tokenKey}",` +
    `oauth_signature_method="HMAC-SHA1",` +
    `oauth_timestamp="${timestamp}",` +
    `oauth_nonce="${nonce}",` +
    `oauth_version="1.0",` +
    `oauth_signature="${signature}"`;

  const fullUrl = `${baseUrl}?guide_type=sold&new_or_used=N`;

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });

  const text = await response.text();

  return Response.json({
    debug: {
      envVarsLoaded: true,
      consumerKeyFirst8: consumerKey.substring(0, 8),
      tokenKeyFirst8: tokenKey.substring(0, 8),
      timestamp,
      nonce,
      paramString,
      signatureBase,
      signingKey: signingKey.substring(0, 20) + "...",
      signature,
      authHeader,
      responseStatus: response.status,
      responseBody: text,
    },
  });
}
