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

// Download and parse the Rebrickable sets CSV
async function downloadCSV() {
  return new Promise((resolve, reject) => {
    const url = "https://cdn.rebrickable.com/media/downloads/sets.csv.gz";
    console.log("Downloading Rebrickable sets CSV...");

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

function parseCSV(csv) {
  const lines = csv.split("\n");
  const headers = lines[0].split(",");
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = (values[i] || "").trim().replace(/^"|"$/g, "");
      });
      return obj;
    });
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

  const csv = await downloadCSV();
  const rows = parseCSV(csv);
  console.log(`Rebrickable sets: ${rows.length}`);

  const newSets = [];

  for (const row of rows) {
    const setNumber = row.set_num?.replace(/-\d+$/, "");
    if (!setNumber || existingNumbers.has(setNumber)) continue;

    const year = parseInt(row.year, 10) || 2020;
    const numParts = parseInt(row.num_parts, 10) || 0;
    const name = row.name || "";
    const theme = getTheme(row.theme_name || row.theme || "Other");

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

  if (newSets.length === 0) {
    console.log("No new sets to add");
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
    execSync(`git commit -m "Add ${newSets.length} sets from Rebrickable import"`, {
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
