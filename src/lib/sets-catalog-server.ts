import "server-only";

import { readFileSync } from "fs";
import { resolve } from "path";
import type { LegoSet } from "@/lib/analyze-types";

type RawCatalog = { sets: LegoSet[] } | LegoSet[];

let setsCache: LegoSet[] | null = null;

function normalizeCatalog(raw: RawCatalog): LegoSet[] {
  if (Array.isArray(raw)) return raw;
  return raw.sets || [];
}

export function getCatalogSets(): LegoSet[] {
  if (!setsCache) {
    const raw = JSON.parse(
      readFileSync(resolve(process.cwd(), "data/sets.json"), "utf-8"),
    ) as RawCatalog;
    setsCache = normalizeCatalog(raw);
  }
  return setsCache;
}

export function clearCatalogCache(): void {
  setsCache = null;
}

export interface CatalogListItem {
  number: string;
  setNumber: string;
  name: string;
  theme: string;
  year: number;
  retired: boolean;
  retiringSoon: boolean;
}

export function toCatalogListItem(set: LegoSet): CatalogListItem {
  return {
    number: set.number,
    setNumber: set.number,
    name: set.name,
    theme: set.theme,
    year: set.year,
    retired: set.retired === true,
    retiringSoon: set.retiringSoon === true && set.retired !== true,
  };
}

export function filterCatalogSets(options: {
  q?: string;
  theme?: string;
}): LegoSet[] {
  const sets = getCatalogSets();
  let filtered = sets;

  if (options.q) {
    const query = options.q.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.number.toLowerCase().includes(query) ||
        s.theme.toLowerCase().includes(query),
    );
  }

  if (options.theme) {
    filtered = filtered.filter((s) => s.theme === options.theme);
  }

  return filtered;
}
