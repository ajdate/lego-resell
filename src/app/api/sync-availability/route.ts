import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BRICKSET_API_KEY = process.env.BRICKSET_API_KEY!;
const BRICKSET_BASE = "https://brickset.com/api/v3.asmx";

async function getBricksetSet(setNumber: string) {
  const params = new URLSearchParams({
    apiKey: BRICKSET_API_KEY,
    userHash: "",
    params: JSON.stringify({ setNumber: `${setNumber}-1` }),
  });
  const res = await fetch(`${BRICKSET_BASE}/getSets?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.sets?.[0] ?? null;
}

export async function GET(request: Request) {
  // auth disabled for test

  const filePath = path.join(process.cwd(), "data", "sets.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const catalog = JSON.parse(raw);

  const toCheck = catalog.sets.filter(
    (s: any) => !s.retired && (s.pricing?.sealed?.estimatedValue ?? 0) > 200
  );

  const changes: any[] = [];
  let checked = 0;

  for (const set of toCheck) {
    const num = set.number;
    if (!num) continue;

    try {
      const bs = await getBricksetSet(num);
      if (!bs) continue;
      checked++;

      const availability = bs.availability ?? "";
      const retailPriceAUD =
        bs.LEGOCom?.AU?.retailPrice ?? bs.LEGOCom?.US?.retailPrice ?? null;
      const dateLastAvailable =
        bs.LEGOCom?.AU?.dateLastAvailable ??
        bs.LEGOCom?.US?.dateLastAvailable ??
        null;

      const isRetired =
        availability === "Retired" ||
        availability === "discontinued" ||
        (dateLastAvailable && new Date(dateLastAvailable) < new Date());

      const isRetiringSoon = availability === "End of life";

      if (isRetired && !set.retired) {
        set.retired = true;
        set.retiringSoon = false;
        changes.push({ number: num, name: set.name, change: "marked retired" });
      } else if (isRetiringSoon && !set.retiringSoon) {
        set.retiringSoon = true;
        changes.push({ number: num, name: set.name, change: "marked retiringSoon" });
      }

      if (retailPriceAUD && set.msrp !== retailPriceAUD) {
        set.msrp = retailPriceAUD;
        changes.push({ number: num, name: set.name, change: `msrp updated to ${retailPriceAUD}` });
      }
    } catch (e) {
      console.error(`Error checking ${num}:`, e);
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  if (changes.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
  }

  return NextResponse.json({
    checked,
    changes,
    message: changes.length > 0 ? `Updated ${changes.length} sets` : "No changes needed",
  });
}
