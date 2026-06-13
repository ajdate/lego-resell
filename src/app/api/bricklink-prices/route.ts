import crypto from "crypto";

function generateOAuthHeader(url: string, method: string) {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY!;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET!;
  const tokenValue = process.env.BRICKLINK_TOKEN_VALUE!;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: tokenValue,
    oauth_version: "1.0",
  };

  const urlObj = new URL(url);
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(urlObj.origin + urlObj.pathname),
    encodeURIComponent(sortedParams),
  ].join("&");

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature: signature,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: tokenValue,
    oauth_version: "1.0",
  };

  return (
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map(
        (k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`,
      )
      .join(", ")
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber") || "75192";
  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  const url = `https://api.bricklink.com/api/store/v1/items/set/${blSetNumber}/price?guide_type=sold&new_or_used=N`;

  try {
    const authHeader = generateOAuthHeader(url, "GET");

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const rawText = await response.text();

    return Response.json({
      status: response.status,
      statusText: response.statusText,
      url: url,
      rawResponse: rawText,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return Response.json(
      {
        error: err.message,
        stack: err.stack,
      },
      { status: 500 },
    );
  }
}
