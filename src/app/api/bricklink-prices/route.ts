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
    .map(
      (k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`,
    )
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

  const headerString =
    "OAuth " +
    Object.keys(oauthParams)
      .map(
        (k) =>
          `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`,
      )
      .join(", ");

  return headerString;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber");

  if (!setNumber) {
    return Response.json({ error: "Set number required" }, { status: 400 });
  }

  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  try {
    const urlNew = `https://api.bricklink.com/api/store/v1/items/set/${encodeURIComponent(blSetNumber)}/price?guide_type=sold&new_or_used=N`;
    const urlUsed = `https://api.bricklink.com/api/store/v1/items/set/${encodeURIComponent(blSetNumber)}/price?guide_type=sold&new_or_used=U`;

    const [responseNew, responseUsed] = await Promise.all([
      fetch(urlNew, {
        headers: { Authorization: generateOAuthHeader(urlNew, "GET") },
      }),
      fetch(urlUsed, {
        headers: { Authorization: generateOAuthHeader(urlUsed, "GET") },
      }),
    ]);

    const [dataNew, dataUsed] = await Promise.all([
      responseNew.json(),
      responseUsed.json(),
    ]);

    console.log("BrickLink NEW response:", JSON.stringify(dataNew, null, 2));
    console.log("BrickLink USED response:", JSON.stringify(dataUsed, null, 2));

    return Response.json({
      setNumber,
      debug: {
        newResponse: dataNew,
        usedResponse: dataUsed,
      },
      sealed: {
        avgPrice: dataNew?.data?.avg_price || null,
        minPrice: dataNew?.data?.min_price || null,
        maxPrice: dataNew?.data?.max_price || null,
        qtySold: dataNew?.data?.unit_quantity || null,
      },
      used: {
        avgPrice: dataUsed?.data?.avg_price || null,
        minPrice: dataUsed?.data?.min_price || null,
        maxPrice: dataUsed?.data?.max_price || null,
        qtySold: dataUsed?.data?.unit_quantity || null,
      },
    });
  } catch (error) {
    console.error("BrickLink API error:", error);
    return Response.json({ error: "BrickLink API error" }, { status: 500 });
  }
}
