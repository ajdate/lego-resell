export type BenchmarkRisk = "Very Low" | "Low-Medium" | "Medium" | "Medium-High" | "Extreme";

export type Benchmark = {
  id: string;
  label: string;
  cagr: number;
  color: string;
  description: string;
  risk: BenchmarkRisk;
  disclaimer?: boolean;
};

export const BENCHMARKS: Benchmark[] = [
  {
    id: "avg-lego",
    label: "Average LEGO Set",
    cagr: 8,
    color: "#6b7280",
    description: "Average appreciation across all LEGO sets",
    risk: "Low-Medium",
  },
  {
    id: "premium-lego",
    label: "Premium LEGO (UCS/Modular)",
    cagr: 15,
    color: "#f59e0b",
    description: "UCS Star Wars and Modular buildings historically",
    risk: "Medium",
  },
  {
    id: "sp500",
    label: "S&P 500",
    cagr: 10.5,
    color: "#3b82f6",
    description: "US stock market reference (AUD unhedged)",
    risk: "Medium",
  },
  {
    id: "asx200",
    label: "ASX 200",
    cagr: 8.5,
    color: "#06b6d4",
    description: "Australian stock market reference",
    risk: "Medium",
  },
  {
    id: "property",
    label: "Australian Property",
    cagr: 7.2,
    color: "#8b5cf6",
    description: "National average residential property",
    risk: "Low-Medium",
  },
  {
    id: "gold",
    label: "Gold (AUD)",
    cagr: 8.8,
    color: "#fbbf24",
    description: "Gold price in Australian dollars",
    risk: "Low-Medium",
  },
  {
    id: "cash",
    label: "High Interest Savings",
    cagr: 3.5,
    color: "#9ca3af",
    description: "Australian HISA average rate",
    risk: "Very Low",
  },
  {
    id: "bitcoin",
    label: "Bitcoin",
    cagr: 44,
    color: "#f97316",
    description: "Extreme volatility — reference only",
    risk: "Extreme",
    disclaimer: true,
  },
];

export function calculateBenchmarkValue(invested: number, cagr: number, years: number): number {
  if (invested <= 0 || years <= 0) return invested;
  return Math.round(invested * Math.pow(1 + cagr / 100, years));
}

export function getBenchmarkComparison(setCAGR: number): {
  outperformed: Benchmark[];
  underperformed: Benchmark[];
} {
  const outperformed = BENCHMARKS.filter((b) => setCAGR > b.cagr).sort((a, b) => a.cagr - b.cagr);
  const underperformed = BENCHMARKS.filter((b) => setCAGR <= b.cagr).sort((a, b) => b.cagr - a.cagr);
  return { outperformed, underperformed };
}

export function getPerformanceLabel(setCAGR: number): string {
  if (setCAGR > 20) return "Exceptional — top tier investment";
  if (setCAGR >= 15) return "Strong — outperforms most asset classes";
  if (setCAGR >= 10) return "Good — competitive with equities";
  if (setCAGR >= 8) return "Average — in line with market returns";
  if (setCAGR >= 5) return "Below average — consider alternatives";
  return "Poor — underperforms most benchmarks";
}

export function performanceToneClass(setCAGR: number): string {
  if (setCAGR > 15) return "text-emerald-400";
  if (setCAGR >= 10) return "text-green-400";
  if (setCAGR >= 8) return "text-amber-400";
  if (setCAGR >= 5) return "text-orange-400";
  return "text-red-400";
}

