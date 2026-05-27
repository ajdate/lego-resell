export type PlatformId =
  | "ebay"
  | "facebook"
  | "bricklink"
  | "gumtree"
  | "cash";

export type PostagePayer = "buyer" | "seller";

export type CalculatorCondition =
  | "sealed"
  | "complete"
  | "incomplete"
  | "damaged-box";

export const PLATFORMS: {
  id: PlatformId;
  label: string;
  shortLabel: string;
  feeRate: number;
  feeLabel: string;
}[] = [
  {
    id: "ebay",
    label: "eBay Australia",
    shortLabel: "eBay AU",
    feeRate: 0.134,
    feeLabel: "13.4% fee",
  },
  {
    id: "facebook",
    label: "Facebook Marketplace",
    shortLabel: "Facebook",
    feeRate: 0,
    feeLabel: "0% fee",
  },
  {
    id: "bricklink",
    label: "BrickLink",
    shortLabel: "BrickLink",
    feeRate: 0.03,
    feeLabel: "3% fee",
  },
  {
    id: "gumtree",
    label: "Gumtree",
    shortLabel: "Gumtree",
    feeRate: 0,
    feeLabel: "0% fee",
  },
  {
    id: "cash",
    label: "Cash/Local",
    shortLabel: "Gumtree/Cash",
    feeRate: 0,
    feeLabel: "0% fee",
  },
];

export const CALCULATOR_CONDITIONS: {
  value: CalculatorCondition;
  label: string;
}[] = [
  { value: "sealed", label: "Sealed" },
  { value: "complete", label: "Complete" },
  { value: "incomplete", label: "Incomplete" },
  { value: "damaged-box", label: "Damaged Box" },
];

export const PROFIT_CALCULATOR_STORAGE_KEY = "brickvalue-profit-calculator-v1";

export const DEFAULT_POSTAGE_AUD = 15;
export const DEFAULT_PACKAGING_AUD = 5;
export const DEFAULT_HOURLY_RATE_AUD = 30;
export const DEFAULT_LISTING_MINUTES = 15;
export const DEFAULT_PACKING_MINUTES = 30;

export type ProfitInputs = {
  purchasePriceAud: number;
  sellingPriceAud: number;
  platformId: PlatformId;
  postagePayer: PostagePayer;
  postageCostAud: number;
  packagingEnabled: boolean;
  originalPurchasePostageAud: number;
  listingMinutes: number;
  packingMinutes: number;
  hourlyRateAud: number;
};

export type ProfitBreakdown = {
  sellingPrice: number;
  platformFee: number;
  platformFeeRate: number;
  postage: number;
  postageLabel: string;
  packaging: number;
  purchasePrice: number;
  originalPurchasePostage: number;
  timeCost: number;
  totalMinutes: number;
  netProfit: number;
};

export type PlatformComparisonRow = {
  id: PlatformId;
  label: string;
  shortLabel: string;
  feeRate: number;
  feeLabel: string;
  feeAmount: number;
  netProfit: number;
};

export type ProfitVerdict =
  | "strong"
  | "modest"
  | "low"
  | "loss";

function platformFeeAmount(sellingPrice: number, feeRate: number): number {
  return sellingPrice * feeRate;
}

function timeCostAud(
  listingMinutes: number,
  packingMinutes: number,
  hourlyRateAud: number,
): number {
  const hours = (listingMinutes + packingMinutes) / 60;
  return hours * hourlyRateAud;
}

export function computeProfitBreakdown(
  inputs: ProfitInputs,
  feeRate?: number,
): ProfitBreakdown {
  const rate =
    feeRate ??
    PLATFORMS.find((p) => p.id === inputs.platformId)?.feeRate ??
    0;
  const sellingPrice = Math.max(0, inputs.sellingPriceAud);
  const purchasePrice = Math.max(0, inputs.purchasePriceAud);
  const platformFee = platformFeeAmount(sellingPrice, rate);
  const postage =
    inputs.postagePayer === "seller"
      ? Math.max(0, inputs.postageCostAud)
      : 0;
  const packaging = inputs.packagingEnabled ? DEFAULT_PACKAGING_AUD : 0;
  const originalPurchasePostage = Math.max(
    0,
    inputs.originalPurchasePostageAud,
  );
  const totalMinutes = inputs.listingMinutes + inputs.packingMinutes;
  const timeCost = timeCostAud(
    inputs.listingMinutes,
    inputs.packingMinutes,
    inputs.hourlyRateAud,
  );

  const netProfit =
    sellingPrice -
    platformFee -
    postage -
    packaging -
    purchasePrice -
    originalPurchasePostage -
    timeCost;

  return {
    sellingPrice,
    platformFee,
    platformFeeRate: rate,
    postage,
    postageLabel:
      inputs.postagePayer === "buyer" ? "Postage (buyer pays)" : "Postage",
    packaging,
    purchasePrice,
    originalPurchasePostage,
    timeCost,
    totalMinutes,
    netProfit,
  };
}

export function computePlatformComparison(
  inputs: ProfitInputs,
): PlatformComparisonRow[] {
  return PLATFORMS.map((platform) => {
    const breakdown = computeProfitBreakdown(inputs, platform.feeRate);
    return {
      id: platform.id,
      label: platform.label,
      shortLabel: platform.shortLabel,
      feeRate: platform.feeRate,
      feeLabel: platform.feeLabel,
      feeAmount: breakdown.platformFee,
      netProfit: breakdown.netProfit,
    };
  });
}

export function computeBreakEvenPrice(
  inputs: Omit<ProfitInputs, "sellingPriceAud">,
  includeTime: boolean,
  feeRate: number,
): number {
  const postage =
    inputs.postagePayer === "seller"
      ? Math.max(0, inputs.postageCostAud)
      : 0;
  const packaging = inputs.packagingEnabled ? DEFAULT_PACKAGING_AUD : 0;
  const fixed =
    postage +
    packaging +
    Math.max(0, inputs.purchasePriceAud) +
    Math.max(0, inputs.originalPurchasePostageAud);
  const time = includeTime
    ? timeCostAud(
        inputs.listingMinutes,
        inputs.packingMinutes,
        inputs.hourlyRateAud,
      )
    : 0;
  const divisor = 1 - feeRate;
  if (divisor <= 0) return fixed + time;
  return (fixed + time) / divisor;
}

export function computeRoiPercent(
  netProfit: number,
  purchasePrice: number,
): number {
  if (purchasePrice <= 0) return netProfit > 0 ? 100 : 0;
  return (netProfit / purchasePrice) * 100;
}

export function computeProfitMarginPercent(
  netProfit: number,
  sellingPrice: number,
): number {
  if (sellingPrice <= 0) return 0;
  return (netProfit / sellingPrice) * 100;
}

export function computeEffectiveHourlyRate(
  netProfit: number,
  totalMinutes: number,
): number | null {
  if (totalMinutes <= 0) return null;
  return netProfit / (totalMinutes / 60);
}

export function computeMultiplier(
  sellingPrice: number,
  purchasePrice: number,
): number | null {
  if (purchasePrice <= 0) return null;
  return sellingPrice / purchasePrice;
}

export function getProfitVerdict(
  roiPercent: number,
  netProfit: number,
): ProfitVerdict {
  if (netProfit < 0) return "loss";
  if (roiPercent > 30) return "strong";
  if (roiPercent >= 10) return "modest";
  return "low";
}

export function verdictLabel(verdict: ProfitVerdict): string {
  switch (verdict) {
    case "strong":
      return "Strong Profit";
    case "modest":
      return "Modest Profit";
    case "low":
      return "Low Margin";
    case "loss":
      return "Loss";
  }
}

export function buildVerdictInsight(
  sellingPriceAud: number,
  purchasePriceAud: number,
  netProfit: number,
  roiPercent: number,
  platformLabel: string,
  formatPrice: (aud: number) => string,
): string {
  const roiRounded = Math.round(roiPercent);
  if (netProfit < 0) {
    return `At ${formatPrice(sellingPriceAud)} on ${platformLabel} you would lose ${formatPrice(Math.abs(netProfit))} after fees, postage and time on your ${formatPrice(purchasePriceAud)} purchase.`;
  }
  return `At ${formatPrice(sellingPriceAud)} on ${platformLabel} this is a ${roiRounded >= 30 ? "strong" : roiRounded >= 10 ? "solid" : "modest"} return — ${formatPrice(netProfit)} net profit with ${roiRounded}% ROI on your ${formatPrice(purchasePriceAud)} purchase.`;
}

export function isCalculatorCondition(
  value: string | null,
): value is CalculatorCondition {
  return CALCULATOR_CONDITIONS.some((c) => c.value === value);
}

export type SavedCalculatorSettings = {
  platformId: PlatformId;
  postagePayer: PostagePayer;
  postageCostAud: number;
  packagingEnabled: boolean;
  originalPurchasePostageAud: number;
  listingMinutes: number;
  packingMinutes: number;
  hourlyRateAud: number;
};
