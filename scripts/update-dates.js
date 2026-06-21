const fs = require("fs");
const path = require("path");

const today = new Date().toISOString().split("T")[0];
const setsPath = path.resolve(__dirname, "../data/sets.json");

const raw = JSON.parse(fs.readFileSync(setsPath, "utf-8"));
const sets = Array.isArray(raw) ? raw : raw.sets;
const oldCount = sets.filter((s) => s.lastUpdated !== today).length;

const updatedSets = sets.map((s) => ({
  ...s,
  lastUpdated: today,
}));

const output = Array.isArray(raw) ? updatedSets : { ...raw, sets: updatedSets };
fs.writeFileSync(setsPath, JSON.stringify(output, null, 2));
console.log(`Updated ${oldCount} sets to ${today}`);
