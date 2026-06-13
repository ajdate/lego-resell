import crypto from "crypto";
import OAuth from "oauth-1.0a";

export interface BrickLinkPriceBand {
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  qtySold: number | null;
}

function parseBrickLinkPrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function parseBrickLinkQty(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function mapPriceBand(data: Record<string, unknown> | undefined): BrickLinkPriceBand {
  return {
    avgPrice: parseBrickLinkPrice(data?.avg_price),
    minPrice: parseBrickLinkPrice(data?.min_price),
    maxPrice: parseBrickLinkPrice(data?.max_price),
    qtySold: parseBrickLinkQty(data?.unit_quantity),
  };
}

function isBrickLinkConfigured(): boolean {
  return Boolean(
    process.env.BRICKLINK_CONSUMER_KEY &&
      process.env.BRICKLINK_CONSUMER_SECRET &&
      process.env.BRICKLINK_TOKEN_VALUE &&
      process.env.BRICKLINK_TOKEN_SECRET,
  );
}

async function fetchBrickLinkPriceGuide(
  oauth: OAuth,
  token: { key: string; secret: string },
  blSetNumber: string,
  newOrUsed: "N" | "U",
): Promise<BrickLinkPriceBand> {
  const url = `https://api.bricklink.com/api/store/v1/items/set/${encodeURIComponent(blSetNumber)}/price?guide_type=sold&new_or_used=${newOrUsed}&currency_code=AUD&region=australia`;
  const authHeader = oauth.toHeader(
    oauth.authorize({ url, method: "GET" }, token),
  );

  const response = await fetch(url, {
    headers: { ...authHeader },
    next: { revalidate: 3600 },
  });

  const body = (await response.json()) as {
    meta?: { code?: number; message?: string };
    data?: Record<string, unknown>;
  };

  if (!response.ok || (body.meta?.code != null && body.meta.code !== 200)) {
    return {
      avgPrice: null,
      minPrice: null,
      maxPrice: null,
      qtySold: null,
    };
  }

  return mapPriceBand(body.data);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setNumber = searchParams.get("setNumber")?.trim();

  if (!setNumber) {
    return Response.json({ error: "Set number required" }, { status: 400 });
  }

  if (!isBrickLinkConfigured()) {
    return Response.json(
      { error: "BrickLink API credentials not configured" },
      { status: 503 },
    );
  }

  const oauth = new OAuth({
    consumer: {
      key: process.env.BRICKLINK_CONSUMER_KEY!,
      secret: process.env.BRICKLINK_CONSUMER_SECRET!,
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64");
    },
  });

  const token = {
    key: process.env.BRICKLINK_TOKEN_VALUE!,
    secret: process.env.BRICKLINK_TOKEN_SECRET!,
  };

  const blSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  try {
    const [sealed, used] = await Promise.all([
      fetchBrickLinkPriceGuide(oauth, token, blSetNumber, "N"),
      fetchBrickLinkPriceGuide(oauth, token, blSetNumber, "U"),
    ]);

    return Response.json({
      setNumber,
      sealed,
      used,
    });
  } catch {
    return Response.json({ error: "BrickLink API error" }, { status: 500 });
  }
}
