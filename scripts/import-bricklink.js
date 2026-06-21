require("dotenv").config({ path: ".env.local" });

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const setsFilePath = path.join(projectRoot, "data", "sets.json");

function generateOAuthHeader(method, url) {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET
  const tokenKey = process.env.BRICKLINK_TOKEN_VALUE
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(8).toString('hex')

  const urlObj = new URL(url)
  const queryParams = {}
  urlObj.searchParams.forEach((value, key) => {
    queryParams[key] = value
  })

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: tokenKey,
    oauth_version: '1.0',
  }

  const allParams = { ...queryParams, ...oauthParams }
  const sortedKeys = Object.keys(allParams).sort()
  const paramString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&')

  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  const signatureBase = `${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(paramString)}`
  const signingKey = `${consumerSecret}&${tokenSecret}`

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64')

  return `OAuth oauth_consumer_key="${consumerKey}",oauth_token="${tokenKey}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${timestamp}",oauth_nonce="${nonce}",oauth_version="1.0",oauth_signature="${signature}"`
}

function autoRecommendation(retired, estimatedValue, retiringSoon) {
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

function toCatalogSet(entry) {
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

async function importBrickLinkSets() {
  const raw = JSON.parse(fs.readFileSync(setsFilePath, "utf-8"));
  const existingSets = Array.isArray(raw) ? raw : raw.sets ?? [];
  const existingNumbers = new Set(
    existingSets.map((s) => String(s.number ?? s.setNumber)),
  );

  const catUrl = "https://api.bricklink.com/api/store/v1/categories";
  const catHeader = generateOAuthHeader("GET", catUrl);
  const catRes = await fetch(catUrl, { headers: { Authorization: catHeader } });
  const catData = await catRes.json();
  console.log("Categories response:", JSON.stringify(catData).substring(0, 200));
  const categories = [];

  if (catData?.data) {
    for (const cat of catData.data) {
      const category_id = cat.category_id ?? cat.categoryID ?? cat.id;
      const category_name = cat.category_name ?? cat.name;
      if (category_id !== undefined && category_name) {
        categories.push({ category_id, category_name });
      }
    }
  }

  const newSets = [];
  let added = 0;
  let skipped = 0;

  // Get sets for each category
  for (const category of categories) {
    const url = `https://api.bricklink.com/api/store/v1/items/set?category_id=${category.category_id}`;
    const authHeader = generateOAuthHeader("GET", url);
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    const data = await res.json();

    console.log(
      `Category ${category.category_name}: status ${res.status}`,
      JSON.stringify(data).substring(0, 200),
    );

    if (!data?.data || data.data.length === 0) continue;

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
      const theme = category.category_name || "Other";

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
      `Category ${category.category_name}: processed ${data.data.length} sets, added ${added} so far`,
    );

    await new Promise((r) => setTimeout(r, 300));

    // Only do first 3 categories to test
    if (categories.indexOf(category) >= 3) break;
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

  fs.writeFileSync(setsFilePath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");

  return { added, skipped, total: mergedSets.length };
}

function gitCommitAndPush(added) {
  if (added === 0) {
    console.log("No new sets added — skipping git commit.");
    return;
  }

  console.log("Committing and pushing updated data/sets.json...");
  execSync("git add data/sets.json", { stdio: "inherit", cwd: projectRoot });
  execSync(`git commit -m "Import ${added} sets from BrickLink API"`, {
    stdio: "inherit",
    cwd: projectRoot,
  });
  execSync("git push", { stdio: "inherit", cwd: projectRoot });
}

async function main() {
  process.chdir(projectRoot);

  const result = await importBrickLinkSets();
  console.log(
    `Added ${result.added} new sets, skipped ${result.skipped} existing sets`,
  );
  console.log(`Total sets in catalogue: ${result.total}`);

  gitCommitAndPush(result.added);
}

main().catch((error) => {
  console.error("BrickLink import failed:", error.message || error);
  process.exit(1);
});
