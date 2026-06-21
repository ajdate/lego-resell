import crypto from "crypto";
import fs from "fs";

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
    .map(
      (k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`,
    )
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

function autoRecommendation(
  retired: boolean,
  estimatedValue: number,
  retiringSoon: boolean,
) {
  if (retiringSoon) {
    return {
      recommendation: "HOLD",
      reason: "Approaching retirement — hold for price appreciation",
    };
  }
  if (!retired) {
    return {
      recommendation: "HOLD",
      reason: "Currently available at retail — monitor for retirement",
    };
  }
  if (estimatedValue > 200) {
    return {
      recommendation: "SELL",
      reason: "Retired set with strong secondary market value",
    };
  }
  if (estimatedValue > 100) {
    return {
      recommendation: "SELL",
      reason: "Retired set with consistent collector demand",
    };
  }
  if (estimatedValue > 50) {
    return {
      recommendation: "SELL",
      reason: "Retired set with modest collector demand",
    };
  }
  return {
    recommendation: "HOLD",
    reason: "Retired set with limited secondary market value",
  };
}

type ImportedSet = {
  setNumber: string;
  name: string;
  theme: string;
  year: number;
  pieces: number;
  retired: boolean;
  retiringSoon: boolean;
  estimatedValue: number;
  suggestedListPrice: number;
  recommendation: string;
  reason: string;
  lastUpdated: string;
  dataSource: string;
};

function toCatalogSet(entry: ImportedSet) {
  return {
    number: entry.setNumber,
    name: entry.name,
    theme: entry.theme,
    year: entry.year,
    pieces: entry.pieces,
    msrp: 0,
    retired: entry.retired,
    retiringSoon: entry.retiringSoon,
    lastUpdated: entry.lastUpdated,
    dataSource: entry.dataSource,
    pricing: {
      sealed: { estimatedValue: entry.estimatedValue, trend: "stable" },
      complete: {
        estimatedValue: Math.round(entry.estimatedValue * 0.7),
        trend: "stable",
      },
      incomplete: {
        estimatedValue: Math.round(entry.estimatedValue * 0.4),
        trend: "falling",
      },
    },
    analysis: {
      sealed: {
        estimatedValue: entry.estimatedValue,
        recommendedListPrice: entry.suggestedListPrice,
        recommendation: entry.recommendation,
        reasoning: entry.reason,
      },
    },
  };
}

export async function importBrickLinkSets({
  setsFilePath,
}: {
  setsFilePath: string;
}) {
  const raw = JSON.parse(fs.readFileSync(setsFilePath, "utf-8"));
  const existingSets = Array.isArray(raw) ? raw : (raw.sets ?? []);
  const existingNumbers = new Set(
    existingSets.map((s: { number?: string; setNumber?: string }) =>
      String(s.number ?? s.setNumber),
    ),
  );

  const catUrl = "https://api.bricklink.com/api/store/v1/categories";
  const catHeader = generateOAuthHeader("GET", catUrl);
  const catRes = await fetch(catUrl, { headers: { Authorization: catHeader } });
  const catData = await catRes.json();
  const categoryMap: Record<number, string> = {};
  if (catData?.data) {
    for (const cat of catData.data) {
      const id = cat.id ?? cat.category_id ?? cat.categoryID;
      const name = cat.name ?? cat.category_name;
      if (id !== undefined && name) {
        categoryMap[id] = name;
      }
    }
  }

  const newSets: ImportedSet[] = [];
  let added = 0;
  let skipped = 0;
  const pageSize = 500;

  for (let page = 1; page <= 20; page++) {
    const url = `https://api.bricklink.com/api/store/v1/items/set?type=S&page_size=${pageSize}&page=${page}`;
    const authHeader = generateOAuthHeader("GET", url);
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    const data = await res.json();

    if (!data?.data || data.data.length === 0) break;

    for (const item of data.data) {
      const setNumber = String(item.no).replace(/-1$/, "");

      if (existingNumbers.has(setNumber)) {
        skipped++;
        continue;
      }

      const retired = item.is_obsolete || false;
      const estimatedValue = Math.round(
        (parseFloat(item.avg_price || "0") || 0) * 1.55,
      );
      const { recommendation, reason } = autoRecommendation(
        retired,
        estimatedValue,
        false,
      );
      const categoryId = item.category_id ?? item.categoryID;
      const theme = categoryMap[categoryId] || "Other";

      newSets.push({
        setNumber,
        name: item.name,
        theme,
        year: item.year_released || 2020,
        pieces: item.weight ? Math.round(parseFloat(item.weight) * 10) : 0,
        retired,
        retiringSoon: false,
        estimatedValue: estimatedValue || 30,
        suggestedListPrice: Math.round((estimatedValue || 30) * 1.1),
        recommendation,
        reason,
        lastUpdated: new Date().toISOString().split("T")[0],
        dataSource: "BrickLink API",
      });
      added++;
      existingNumbers.add(setNumber);
    }

    console.log(
      `Page ${page}: processed ${data.data.length} sets, added ${added} so far`,
    );

    await new Promise((r) => setTimeout(r, 500));
  }

  const mergedSets = [
    ...existingSets,
    ...newSets.map((entry) => toCatalogSet(entry)),
  ];

  const output = Array.isArray(raw)
    ? mergedSets
    : {
        ...raw,
        sets: mergedSets,
      };

  fs.writeFileSync(setsFilePath, JSON.stringify(output, null, 2));

  return { added, skipped, total: mergedSets.length };
}
