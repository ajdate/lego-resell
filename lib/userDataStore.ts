import type { PortfolioItem } from "@/lib/portfolio";
import type { WatchlistItem } from "@/lib/watchlist";
import type { PriceTarget } from "@/lib/priceTargets";
import {
  getDismissedAlertIds,
  getPortfolio,
  getPriceTargets,
  getReadAlertIds,
  getWatchlist,
  migrateLocalStorageToSupabase,
  savePortfolioItems,
  savePriceTargets,
  saveWatchlistItems,
} from "@/src/lib/userDataService";

let activeUserId: string | null = null;
let dataReady = true;
let portfolioCache: PortfolioItem[] | null = null;
let watchlistCache: WatchlistItem[] | null = null;
let priceTargetsCache: PriceTarget[] | null = null;
let dismissedAlertIds = new Set<string>();
let readAlertIds = new Set<string>();
let initPromise: Promise<void> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeUserData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listeners.add(listener) && listeners.delete(listener);
  for (const listener of [...listeners]) listener();
}

export function getActiveUserId(): string | null {
  return activeUserId;
}

export function isUserDataReady(): boolean {
  return dataReady;
}

export function getPortfolioCache(): PortfolioItem[] | null {
  return portfolioCache;
}

export function getWatchlistCache(): WatchlistItem[] | null {
  return watchlistCache;
}

export function getPriceTargetsCache(): PriceTarget[] | null {
  return priceTargetsCache;
}

export function getDismissedAlertIdsCache(): Set<string> {
  return dismissedAlertIds;
}

export function getReadAlertIdsCache(): Set<string> {
  return readAlertIds;
}

export function setPortfolioCache(items: PortfolioItem[]): void {
  portfolioCache = items;
  notify();
}

export function setWatchlistCache(items: WatchlistItem[]): void {
  watchlistCache = items;
  notify();
}

export function setPriceTargetsCache(items: PriceTarget[]): void {
  priceTargetsCache = items;
  notify();
}

export async function persistPortfolioCache(): Promise<void> {
  if (!activeUserId || portfolioCache === null) return;
  await savePortfolioItems(
    activeUserId,
    portfolioCache as unknown as Record<string, unknown>[],
  );
}

export async function persistWatchlistCache(): Promise<void> {
  if (!activeUserId || watchlistCache === null) return;
  await saveWatchlistItems(
    activeUserId,
    watchlistCache as unknown as Record<string, unknown>[],
  );
}

export async function persistPriceTargetsCache(): Promise<void> {
  if (!activeUserId || priceTargetsCache === null) return;
  await savePriceTargets(
    activeUserId,
    priceTargetsCache as unknown as Record<string, unknown>[],
  );
}

export async function initUserData(userId: string | null): Promise<void> {
  if (initPromise) await initPromise;

  initPromise = (async () => {
    activeUserId = userId;
    dataReady = false;
    notify();

    if (!userId) {
      portfolioCache = null;
      watchlistCache = null;
      priceTargetsCache = null;
      dismissedAlertIds = new Set();
      readAlertIds = new Set();
      dataReady = true;
      notify();
      return;
    }

    try {
      await migrateLocalStorageToSupabase(userId);

      const [portfolio, watchlist, targets, dismissed, read] = await Promise.all([
        getPortfolio(userId),
        getWatchlist(userId),
        getPriceTargets(userId),
        getDismissedAlertIds(userId),
        getReadAlertIds(userId),
      ]);

      portfolioCache = portfolio as PortfolioItem[];
      watchlistCache = watchlist as WatchlistItem[];
      priceTargetsCache = targets as PriceTarget[];
      dismissedAlertIds = new Set(dismissed);
      readAlertIds = new Set(read);
    } catch (error) {
      console.error("Failed to initialize user data:", error);
      portfolioCache = [];
      watchlistCache = [];
      priceTargetsCache = [];
      dismissedAlertIds = new Set();
      readAlertIds = new Set();
    } finally {
      dataReady = true;
      notify();
    }
  })();

  await initPromise;
  initPromise = null;
}
