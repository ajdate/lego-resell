const https = require("https");
const fs = require("fs");
const path = require("path");

async function fetchBricksetRetiringSoon() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "brickset.com",
      path: "/sets/retiring-soon",
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    };

    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function extractSetNumbers(html) {
  const setNumbers = new Set();

  // Brickset uses patterns like "75192-1" or set number in URLs
  const patterns = [
    /\/sets\/(\d{4,6}-\d+)\//g,
    /data-set-id="(\d{4,6})"/g,
    /set-number['":\s]+['"]*(\d{4,6})/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const num = match[1].replace(/-\d+$/, "");
      if (num.length >= 4 && num.length <= 6) {
        setNumbers.add(num);
      }
    }
  }

  return [...setNumbers];
}

async function main() {
  console.log("Fetching retiring soon sets from Brickset...");

  const html = await fetchBricksetRetiringSoon();
  const retiringSetNumbers = extractSetNumbers(html);

  console.log(
    `Found ${retiringSetNumbers.length} retiring soon sets:`,
    retiringSetNumbers,
  );

  if (retiringSetNumbers.length === 0) {
    console.log("No sets found - HTML may have changed structure");
    console.log("First 2000 chars of response:", html.substring(0, 2000));
    return;
  }

  // Update sets.json
  const setsPath = path.resolve(__dirname, "../data/sets.json");
  const raw = JSON.parse(fs.readFileSync(setsPath, "utf-8"));
  const sets = Array.isArray(raw) ? raw : raw.sets;

  let updatedCount = 0;
  let clearedCount = 0;

  // First clear all retiringSoon flags
  sets.forEach((set) => {
    if (set.retiringSoon) {
      set.retiringSoon = false;
      clearedCount++;
    }
  });

  // Then set flags for Brickset retiring soon sets
  sets.forEach((set) => {
    const setNum = String(set.setNumber || set.number || "");
    if (retiringSetNumbers.includes(setNum)) {
      set.retiringSoon = true;
      set.recommendation = "HOLD";
      set.reason =
        "Retiring soon — hold for retirement price appreciation";
      updatedCount++;
      console.log(`Marked retiring soon: ${setNum} - ${set.name}`);
    }
  });

  const output = Array.isArray(raw) ? sets : { ...raw, sets };
  fs.writeFileSync(setsPath, JSON.stringify(output, null, 2));
  console.log(`\nCleared ${clearedCount} old retiring soon flags`);
  console.log(`Marked ${updatedCount} sets as retiring soon`);
  console.log(`Total sets: ${sets.length}`);

  // Git commit and push
  if (updatedCount > 0) {
    const { execSync } = require("child_process");
    try {
      execSync("git add data/sets.json", {
        cwd: path.resolve(__dirname, ".."),
      });
      execSync(
        `git commit -m "Update retiring soon data from Brickset - ${updatedCount} sets"`,
        { cwd: path.resolve(__dirname, "..") },
      );
      execSync("git push", { cwd: path.resolve(__dirname, "..") });
      console.log("Pushed to GitHub successfully");
    } catch (e) {
      console.log("Git push failed:", e.message);
    }
  }
}

main().catch(console.error);
