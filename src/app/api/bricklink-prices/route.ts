import { NextRequest } from "next/server";
import crypto from "crypto";

// @ts-ignore
import OAuth from "oauth-1.0a";

const oauth = new OAuth({
  consumer: {
    key: process.env.BRICKLINK_CONSUMER_KEY!,
    secret: process.env.BRICKLINK_CONSUMER_SECRET!,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string: string, key: string) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64");
  },
});

const token = {
  key: process.env.BRICKLINK_TOKEN_VALUE!,
  secret: process.env.BRICKLINK_TOKEN_SECRET!,
};

async function fetchBricklinkPrice(setNumber: string, condition: "N" | "U") {
  const url = `https://api.bricklink.com/api/store/v1/items/set/${setNumber}/price?guide_type=sold&new_or_used=${condition}`;

  const requestData = {
    url,
    method: "GET",
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
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

    console.log("BrickLink sealed meta:", dataNew?.meta);
    console.log("BrickLink used meta:", dataUsed?.meta);

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
