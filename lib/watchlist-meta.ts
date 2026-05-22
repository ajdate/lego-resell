export const WATCHLIST_META_KEY = "lego-watchlist-meta";

export interface WatchlistMeta {
  note?: string;
  buyTargetUsd?: number;
  sellTargetUsd?: number;
}

export type WatchlistMetaMap = Record<string, WatchlistMeta>;

export function loadWatchlistMeta(): WatchlistMetaMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WATCHLIST_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WatchlistMetaMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveWatchlistMeta(map: WatchlistMetaMap): void {
  localStorage.setItem(WATCHLIST_META_KEY, JSON.stringify(map));
}

export function getWatchlistMeta(
  map: WatchlistMetaMap,
  setNumber: string,
): WatchlistMeta {
  return map[setNumber.trim()] ?? {};
}

export function updateWatchlistMeta(
  setNumber: string,
  patch: Partial<WatchlistMeta>,
): WatchlistMetaMap {
  const map = loadWatchlistMeta();
  const key = setNumber.trim();
  const next = { ...getWatchlistMeta(map, key), ...patch };
  const cleaned: WatchlistMeta = {};
  if (next.note?.trim()) cleaned.note = next.note.trim();
  if (next.buyTargetUsd !== undefined && !Number.isNaN(next.buyTargetUsd)) {
    cleaned.buyTargetUsd = next.buyTargetUsd;
  }
  if (next.sellTargetUsd !== undefined && !Number.isNaN(next.sellTargetUsd)) {
    cleaned.sellTargetUsd = next.sellTargetUsd;
  }
  if (Object.keys(cleaned).length === 0) {
    const { [key]: _, ...rest } = map;
    saveWatchlistMeta(rest);
    return rest;
  }
  const updated = { ...map, [key]: cleaned };
  saveWatchlistMeta(updated);
  return updated;
}
