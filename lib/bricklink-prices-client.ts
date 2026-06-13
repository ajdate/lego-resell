export interface BrickLinkPriceBand {
  avgPrice: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  qtySold: number | null;
  totalQty?: number | null;
}

export interface BrickLinkPricesResponse {
  setNumber: string;
  currency?: string;
  sealed: BrickLinkPriceBand;
  used: BrickLinkPriceBand;
}

export function hasBrickLinkSalesData(data: BrickLinkPricesResponse | null): boolean {
  if (!data) return false;
  const bands = [data.sealed, data.used];
  return bands.some(
    (band) =>
      band.avgPrice != null ||
      band.minPrice != null ||
      band.maxPrice != null ||
      (band.qtySold != null && band.qtySold > 0),
  );
}

export function brickLinkSealedDiffersFromEstimate(
  sealedAvg: number | null,
  estimatedValue: number,
  thresholdPercent = 15,
): boolean {
  if (sealedAvg == null || sealedAvg <= 0 || estimatedValue <= 0) return false;
  const diffPercent =
    (Math.abs(sealedAvg - estimatedValue) / estimatedValue) * 100;
  return diffPercent > thresholdPercent;
}

export async function fetchBrickLinkPrices(
  setNumber: string,
): Promise<BrickLinkPricesResponse | null> {
  try {
    const res = await fetch(
      `/api/bricklink-prices?setNumber=${encodeURIComponent(setNumber)}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as BrickLinkPricesResponse;
  } catch {
    return null;
  }
}
