/**
 * Replace estimated catalogue values with real BrickLink sold averages.
 *
 *   node scripts/backfill-bricklink-prices.mjs --dry-run --limit=20   # preview, writes nothing
 *   node scripts/backfill-bricklink-prices.mjs                        # one day's run (~1,500 sets)
 *
 * BrickLink locks accounts that go over ~5,000 API calls a day, and the live
 * site shares these keys, so a run uses at most 3,000. Each set takes 2 calls
 * (new + used), so the full catalogue takes about 15 daily runs. Re-running is safe: sets
 * priced in the last 25 days are skipped. Progress is saved every 100 sets.
 *
 * Prices come straight from BrickLink when the BRICKLINK_* keys are in
 * .env.local; otherwise through the live site's /api/bricklink-prices route,
 * which holds the keys on Vercel (override with --site=https://…).
 *
 * Order: sets in users' portfolios/watchlists → retired sets → biggest sets.
 * Hand-researched sets (dataSource "Manual…" or none) are skipped unless
 * --include-manual is passed.
 */
import crypto from "crypto";
import { readFileSync, writeFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const DRY_RUN = Boolean(args["dry-run"]);
const CALL_LIMIT = Math.min(Number(args.limit ?? 3000), 3000); // API calls this run, capped
const INCLUDE_MANUAL = Boolean(args["include-manual"]);
const MIN_SALES = 3; // ignore averages from fewer sales
const RECHECK_DAYS = 25;
const SETS_PATH = "data/sets.json";

const {
  BRICKLINK_CONSUMER_KEY,
  BRICKLINK_CONSUMER_SECRET,
  BRICKLINK_TOKEN_VALUE,
  BRICKLINK_TOKEN_SECRET,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL,
} = process.env;

const HAS_KEYS = Boolean(
  BRICKLINK_CONSUMER_KEY && BRICKLINK_CONSUMER_SECRET && BRICKLINK_TOKEN_VALUE && BRICKLINK_TOKEN_SECRET,
);
const SITE = String(args.site ?? NEXT_PUBLIC_APP_URL ?? "https://brickvalue.app").replace(/\/$/, "");
console.log(HAS_KEYS ? "Using BrickLink directly." : `No BrickLink keys in .env.local — using ${SITE}/api/bricklink-prices.`);

// ---------- BrickLink ----------

function oauthHeader(url, params) {
  const oauth = {
    oauth_consumer_key: BRICKLINK_CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(8).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: BRICKLINK_TOKEN_VALUE,
    oauth_version: "1.0",
  };
  const all = { ...params, ...oauth };
  const paramString = Object.keys(all)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(all[k])}`)
    .join("&");
  const base = `GET&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signature = crypto
    .createHmac("sha1", `${BRICKLINK_CONSUMER_SECRET}&${BRICKLINK_TOKEN_SECRET}`)
    .update(base)
    .digest("base64");
  // Same header format as src/app/api/bricklink-prices/route.ts
  return `OAuth oauth_consumer_key="${oauth.oauth_consumer_key}",oauth_token="${oauth.oauth_token}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${oauth.oauth_timestamp}",oauth_nonce="${oauth.oauth_nonce}",oauth_version="1.0",oauth_signature="${signature}"`;
}

let callsMade = 0;

/** Worldwide sold price guide (last 6 months) in AUD. */
async function soldGuide(setNumber, condition) {
  const url = `https://api.bricklink.com/api/store/v1/items/set/${setNumber}-1/price`;
  const params = { guide_type: "sold", new_or_used: condition, currency_code: "AUD" };
  callsMade++;
  const res = await fetch(`${url}?${new URLSearchParams(params)}`, {
    headers: { Authorization: oauthHeader(url, params), Accept: "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  const code = body?.meta?.code ?? res.status;
  if (code === 200) return body.data;
  if (code === 404 || code === 400) return null; // set not on BrickLink
  const err = new Error(`BrickLink ${code}: ${body?.meta?.description ?? body?.meta?.message ?? res.statusText}`);
  err.fatal = true; // auth / IP / quota problems — stop the run
  throw err;
}

/** Live-site route, which calls BrickLink with the keys stored on Vercel. */
async function siteGuides(setNumber) {
  callsMade += 2; // the route makes one BrickLink call per condition
  const res = await fetch(`${SITE}/api/bricklink-prices?setNumber=${encodeURIComponent(setNumber)}&region=world`);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.error) {
    const err = new Error(`Site route ${res.status}: ${body?.error ?? res.statusText}`);
    err.fatal = true;
    throw err;
  }
  const toGuide = (band) =>
    band?.avgPrice != null ? { avg_price: band.avgPrice, unit_quantity: band.qtySold ?? 0 } : null;
  return [toGuide(body.sealed), toGuide(body.used)];
}

async function getGuides(setNumber) {
  if (!HAS_KEYS) return siteGuides(setNumber);
  return [await soldGuide(setNumber, "N"), await soldGuide(setNumber, "U")];
}

// ---------- Priority ----------

async function supabaseSetNumbers(table) {
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return [];
  const numbers = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=set_number`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Range: `${from}-${from + 999}`,
      },
    });
    if (!res.ok) break;
    const rows = await res.json();
    numbers.push(...rows.map((r) => String(r.set_number)));
    if (rows.length < 1000) break;
  }
  return numbers;
}

// Same rule the importers use, so recommendations stay consistent
function autoRecommendation(retired, retiringSoon, value) {
  if (retiringSoon) return { recommendation: "HOLD", reasoning: "Approaching retirement — hold for price appreciation" };
  if (!retired) return { recommendation: "HOLD", reasoning: "Currently available at retail — monitor for retirement" };
  if (value > 50) return { recommendation: "SELL", reasoning: "Retired set with real secondary-market sales on BrickLink" };
  return { recommendation: "HOLD", reasoning: "Retired set with limited secondary market value" };
}

// ---------- Main ----------

const raw = JSON.parse(readFileSync(SETS_PATH, "utf-8"));
const sets = Array.isArray(raw) ? raw : raw.sets;
const today = new Date().toISOString().slice(0, 10);
const recheckCutoff = Date.now() - RECHECK_DAYS * 86400000;

const isManual = (s) => !s.dataSource || String(s.dataSource).startsWith("Manual");
const recentlyPriced = (s) => s.priceUpdated && new Date(s.priceUpdated).getTime() > recheckCutoff;

const userSets = new Set([
  ...(await supabaseSetNumbers("portfolio")),
  ...(await supabaseSetNumbers("watchlist")),
]);
console.log(`Sets in users' portfolios/watchlists: ${userSets.size}`);

const queue = sets
  .filter((s) => (INCLUDE_MANUAL || !isManual(s)) && !recentlyPriced(s))
  .sort(
    (a, b) =>
      Number(userSets.has(b.number)) - Number(userSets.has(a.number)) ||
      Number(Boolean(b.retired)) - Number(Boolean(a.retired)) ||
      (b.pieces ?? 0) - (a.pieces ?? 0),
  );
console.log(`To price: ${queue.length} sets · this run: up to ${Math.floor(CALL_LIMIT / 2)}${DRY_RUN ? " · DRY RUN" : ""}\n`);

function save() {
  if (DRY_RUN) return;
  writeFileSync(SETS_PATH, `${JSON.stringify(Array.isArray(raw) ? sets : { ...raw, sets }, null, 2)}\n`);
}

let updated = 0;
let noSales = 0;
let processed = 0;
// A long run of sets with no data at all usually means BrickLink is
// refusing requests (e.g. a lockout), not that nothing sold. Stop and
// undo those, so they aren't marked "no sales" for 25 days.
const emptyStreak = [];
const MAX_EMPTY_STREAK = 25;

try {
  for (const set of queue) {
    if (callsMade + 2 > CALL_LIMIT) break;
    const before = set.pricing?.sealed?.estimatedValue;
    const snapshot = { priceSource: set.priceSource, priceUpdated: set.priceUpdated };
    const [newGuide, usedGuide] = await getGuides(set.number);
    processed++;

    if (!newGuide && !usedGuide) {
      emptyStreak.push([set, snapshot]);
      if (emptyStreak.length >= MAX_EMPTY_STREAK) {
        for (const [s, snap] of emptyStreak) Object.assign(s, snap);
        processed -= emptyStreak.length;
        noSales -= emptyStreak.length - 1;
        const err = new Error(`${MAX_EMPTY_STREAK} sets in a row returned no BrickLink data — BrickLink may be refusing requests.`);
        err.fatal = true;
        throw err;
      }
    } else {
      emptyStreak.length = 0;
    }

    const newQty = newGuide?.unit_quantity ?? 0;
    const usedQty = usedGuide?.unit_quantity ?? 0;

    if (newQty >= MIN_SALES || usedQty >= MIN_SALES) {
      const usedAvg = usedQty >= MIN_SALES ? Math.round(parseFloat(usedGuide.avg_price)) : null;
      // No sealed sales: estimate sealed from used using the old 70% ratio
      const sealed = newQty >= MIN_SALES
        ? Math.round(parseFloat(newGuide.avg_price))
        : Math.round(usedAvg / 0.7);
      const complete = usedAvg ?? Math.round(sealed * 0.7);
      const incomplete = Math.round(complete * 0.57); // same ratio as before

      set.pricing = {
        ...set.pricing,
        sealed: { ...set.pricing?.sealed, estimatedValue: sealed, qtySold: newQty },
        complete: { ...set.pricing?.complete, estimatedValue: complete, qtySold: usedQty },
        incomplete: { ...set.pricing?.incomplete, estimatedValue: incomplete },
      };
      const rec = autoRecommendation(set.retired, set.retiringSoon, sealed);
      set.analysis = {
        ...set.analysis,
        sealed: {
          ...set.analysis?.sealed,
          estimatedValue: sealed,
          recommendedListPrice: Math.round(sealed * 1.08),
          ...rec,
        },
      };
      set.priceSource = "BrickLink sold, last 6 months";
      updated++;
      if (DRY_RUN || processed <= 10) {
        console.log(`${set.number} ${set.name}: A$${before} → A$${sealed} sealed (${newQty} sold), A$${complete} used (${usedQty} sold)`);
      }
    } else {
      set.priceSource = set.priceSource ?? "No recent BrickLink sales — estimated";
      noSales++;
      if (DRY_RUN) console.log(`${set.number} ${set.name}: too few sales (${newQty} new, ${usedQty} used) — kept A$${before}`);
    }
    set.priceUpdated = today;

    if (processed % 100 === 0) {
      save();
      console.log(`… ${processed} sets checked (${updated} updated)`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
} catch (error) {
  console.error(`\nStopped: ${error.message}`);
  if (/IP|TOKEN|SIGNATURE|401/i.test(error.message)) {
    console.error("Check the BrickLink keys, and that this computer's IP is allowed on your BrickLink API token.");
  }
} finally {
  save();
  const remaining = queue.length - processed;
  console.log(`\nChecked ${processed} sets: ${updated} updated with real sold prices, ${noSales} had too few sales.`);
  console.log(`API calls used: ${callsMade}. Remaining to price: ${remaining}${remaining > 0 ? " — run again tomorrow." : "."}`);
  if (!DRY_RUN && processed > 0) console.log('Next: git add data/sets.json && git commit -m "BrickLink price backfill" && git push');
}
