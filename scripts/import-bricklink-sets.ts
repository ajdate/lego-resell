import { readFileSync } from "fs";
import { resolve } from "path";
import { importBrickLinkSets } from "../lib/bricklink-import";

function loadEnvFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    /* ignore missing env file */
  }
}

async function main() {
  const projectRoot = process.cwd();
  loadEnvFile(resolve(projectRoot, ".env.local"));
  loadEnvFile(resolve(projectRoot, ".env"));

  const result = await importBrickLinkSets({
    setsFilePath: resolve(projectRoot, "data/sets.json"),
  });

  console.log(
    `Added ${result.added} new sets, skipped ${result.skipped} existing sets`,
  );
  console.log(`Fetched ${result.totalFetched} sets from BrickLink`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("BrickLink import failed:", message);
  process.exit(1);
});
