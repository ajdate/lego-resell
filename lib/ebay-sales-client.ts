import type { EbaySalesResponse } from "@/lib/ebay-sales";

export async function fetchEbaySales(
  setNumber: string,
  estimatedValueAud?: number,
): Promise<EbaySalesResponse | null> {
  const params = new URLSearchParams({ setNumber });
  if (estimatedValueAud !== undefined && estimatedValueAud > 0) {
    params.set("estimatedValue", String(estimatedValueAud));
  }

  const res = await fetch(`/api/ebay-sales?${params.toString()}`);
  const data = (await res.json()) as EbaySalesResponse & { error?: string };

  if (!res.ok && !data.listings?.length) {
    return null;
  }

  return data;
}
