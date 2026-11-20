const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

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

/*
 * Usage:
 *   node scripts/import-rebrickable.js            # add sets we don't have yet
 *   node scripts/import-rebrickable.js --repair   # also fix name/year/pieces/theme of
 *                                                 # existing Rebrickable sets (never prices)
 *   --from=DIR   read sets.csv and themes.csv from DIR instead of downloading
 */
const args = process.argv.slice(2);
const REPAIR = args.includes("--repair");
const FROM_DIR = (args.find((a) => a.startsWith("--from=")) || "").slice(7);

// Download (or read locally) a Rebrickable CSV file, e.g. "sets" or "themes"
async function downloadCSV(name = "sets") {
  if (FROM_DIR) return fs.readFileSync(path.join(FROM_DIR, `${name}.csv`), "utf-8");
  return new Promise((resolve, reject) => {
    const url = `https://cdn.rebrickable.com/media/downloads/${name}.csv.gz`;
    console.log(`Downloading Rebrickable ${name} CSV...`);

    https
      .get(url, (res) => {
        const chunks = [];
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        gunzip.on("data", (chunk) => chunks.push(chunk));
        gunzip.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        gunzip.on("error", reject);
      })
      .on("error", reject);
  });
}

// Splits one CSV line, respecting quoted fields: "Locomotive, Tender" stays one value
function splitCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { values.push(current); current = ""; }
    else current += ch;
  }
  values.push(current);
  return values.map((v) => v.trim());
}

function parseCSV(csv) {
  const lines = csv.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
}

// sets.csv only has theme_id; map it to the top-level theme name via themes.csv
function buildThemeLookup(themeRows) {
  const byId = new Map(themeRows.map((t) => [t.id, t]));
  return (themeId) => {
    let theme = byId.get(String(themeId));
    for (let guard = 0; theme?.parent_id && guard < 10; guard++) {
      theme = byId.get(String(theme.parent_id)) ?? theme;
      if (!theme.parent_id) break;
    }
    return theme ? getTheme(theme.name) : "Other";
  };
}

// "112-1" is stored as "112"; later sets reusing the number keep it ("112-2")
function storedNumber(setNum) {
  return String(setNum || "").replace(/-1$/, "");
}

function getTheme(themeName) {
  const themeMap = {
    "Star Wars": "Star Wars",
    "Harry Potter": "Harry Potter",
    Technic: "Technic",
    City: "City",
    Creator: "Creator 3-in-1",
    Ideas: "Ideas",
    Architecture: "Architecture",
    "Speed Champions": "Speed Champions",
    "Marvel Super Heroes": "Marvel",
    "DC Comics Super Heroes": "DC",
    Friends: "Friends",
    Ninjago: "Ninjago",
    Disney: "Disney",
    Icons: "Icons",
    "Creator Expert": "Creator Expert",
  };
  return themeMap[themeName] || themeName;
}

function autoRecommendation(year, numParts) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - parseInt(year || currentYear, 10);
  const retired = age > 3;

  if (!retired) {
    return {
      recommendation: "HOLD",
      reason: "Currently available at retail — monitor for retirement",
    };
  }
  if (numParts > 1000) {
    return {
      recommendation: "SELL",
      reason: "Retired large set with strong collector demand",
    };
  }
  if (numParts > 500) {
    return {
      recommendation: "SELL",
      reason: "Retired medium set with consistent collector demand",
    };
  }
  if (age > 10) {
    return {
      recommendation: "SELL",
      reason: "Vintage retired set with nostalgic collector demand",
    };
  }
  return {
    recommendation: "SELL",
    reason: "Retired set with modest collector demand",
  };
}

async function main() {
  const setsPath = path.resolve(__dirname, "../data/sets.json");
  const raw = JSON.parse(fs.readFileSync(setsPath, "utf-8"));
  const existingSets = Array.isArray(raw) ? raw : raw.sets ?? [];
  const existingNumbers = new Set(
    existingSets.map((s) => String(s.number ?? s.setNumber)),
  );

  console.log(`Existing sets: ${existingSets.length}`);

  const rows = parseCSV(await downloadCSV("sets"));
  const themeOf = buildThemeLookup(parseCSV(await downloadCSV("themes")));
  console.log(`Rebrickable sets: ${rows.length}`);

  // --repair: correct details of sets we already imported from Rebrickable
  let repaired = 0;
  if (REPAIR) {
    const byNumber = new Map(rows.map((r) => [storedNumber(r.set_num), r]));
    for (const set of existingSets) {
      if (set.dataSource !== "Rebrickable") continue;
      const row = byNumber.get(String(set.number));
      if (!row) continue;
      const year = parseInt(row.year, 10);
      const pieces = parseInt(row.num_parts, 10);
      const before = JSON.stringify([set.name, set.year, set.pieces, set.theme]);
      if (row.name) set.name = row.name;
      if (year >= 1949 && year <= new Date().getFullYear() + 1) set.year = year;
      if (pieces >= 0 && !Number.isNaN(pieces)) set.pieces = pieces;
      if (!set.theme || set.theme === "Other") set.theme = themeOf(row.theme_id);
      if (JSON.stringify([set.name, set.year, set.pieces, set.theme]) !== before) repaired++;
    }
    console.log(`Repaired details of ${repaired} existing sets`);
  }

  const newSets = [];

  for (const row of rows) {
    const setNumber = storedNumber(row.set_num);
    if (!setNumber || existingNumbers.has(setNumber)) continue;

    const year = parseInt(row.year, 10) || 2020;
    const numParts = parseInt(row.num_parts, 10) || 0;
    const name = row.name || "";
    const theme = themeOf(row.theme_id);

    if (numParts < 20 && numParts > 0) continue;
    if (!name) continue;

    const currentYear = new Date().getFullYear();
    const retired = year < currentYear - 3;
    const estimatedValue = Math.max(30, numParts * 0.15);
    const { recommendation, reason } = autoRecommendation(year, numParts);

    newSets.push({
      setNumber,
      name,
      theme,
      year,
      pieces: numParts,
      retired,
      retiringSoon: year === currentYear - 2 || year === currentYear - 3,
      estimatedValue: Math.round(estimatedValue),
      suggestedListPrice: Math.round(estimatedValue * 1.1),
      recommendation,
      reason,
      lastUpdated: new Date().toISOString().split("T")[0],
      dataSource: "Rebrickable",
    });

    existingNumbers.add(setNumber);
  }

  console.log(`New sets to add: ${newSets.length}`);

  if (newSets.length === 0 && repaired === 0) {
    console.log("Nothing to change");
    return;
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

  fs.writeFileSync(setsPath, JSON.stringify(output, null, 2));
  console.log(`Total sets now: ${mergedSets.length}`);

  const { execSync } = require("child_process");
  const projectRoot = path.resolve(__dirname, "..");
  try {
    execSync("git add data/sets.json", { cwd: projectRoot });
    const msg = [newSets.length && `Add ${newSets.length} sets`, repaired && `repair ${repaired} sets`]
      .filter(Boolean).join(", ");
    execSync(`git commit -m "${msg} from Rebrickable import"`, {
      cwd: projectRoot,
    });
    execSync("git push", { cwd: projectRoot });
    console.log("Pushed to GitHub successfully");
  } catch (e) {
    console.log("Git push failed - you may need to push manually");
    console.log(e.message);
  }
}

main().catch(console.error);
