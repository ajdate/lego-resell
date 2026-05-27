import { findSet, isSetRetired, type Condition, type LegoSet } from "@/lib/analyze";

export type SimulationCondition = Extract<Condition, "sealed" | "complete">;
export type InvestmentGrade = "S" | "A" | "B" | "C" | "D";

export interface AnnualReturn {
  year: number;
  value: number;
  yoyPercent?: number;
  event?: string;
}

export interface SimulationResult {
  setNumber: string;
  setName: string;
  initialInvestment: number;
  startYear: number;
  currentYear: number;
  holdingYears: number;
  estimatedCurrentValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  cagr: number;
  annualReturns: AnnualReturn[];
  peakValue: number;
  peakYear: number;
  volatilityScore: number;
  grade: InvestmentGrade;
  estimatedRetirementYear: number;
  theme: string;
}

export interface BattleComparison {
  resultA: SimulationResult;
  resultB: SimulationResult;
  winner: "a" | "b" | "tie";
  whatThisMeans: string[];
  strategyInsights: string[];
}

export const SIMULATOR_START_YEARS = [
  2015, 2016, 2017, 2018, 2019, 2020, 2021,
] as const;

export const BENCHMARK_CAGR = {
  averageLego: 8,
  sp500: 10,
  premiumLego: 16.5,
} as const;

export const QUICK_BATTLES = [
  {
    id: "modular-classic",
    title: "Modular Classic Battle",
    subtitle: "Cafe Corner vs Green Grocer",
    setA: "10182",
    setB: "10185",
    startYear: 2018,
  },
  {
    id: "ucs-showdown",
    title: "UCS Showdown",
    subtitle: "Millennium Falcon vs Imperial Star Destroyer",
    setA: "75192",
    setB: "75252",
    startYear: 2019,
  },
  {
    id: "creator-expert",
    title: "Creator Expert Clash",
    subtitle: "Aston Martin vs Porsche 911",
    setA: "10262",
    setB: "42056",
    startYear: 2018,
  },
  {
    id: "ideas-battle",
    title: "Ideas Battle",
    subtitle: "Saturn V vs Central Perk",
    setA: "21309",
    setB: "21319",
    startYear: 2018,
  },
  {
    id: "vintage-modern",
    title: "Vintage vs Modern",
    subtitle: "Green Grocer vs Bookshop",
    setA: "10185",
    setB: "10270",
    startYear: 2017,
  },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

function themeMultiplier(theme: string): number {
  if (theme === "Star Wars UCS" || theme === "UCS Star Wars") return 1.4;
  if (theme === "Modular") return 1.35;
  if (theme === "Ideas") return 1.25;
  if (theme === "Creator Expert") return 1.2;
  if (theme === "Architecture" || theme === "Icons") return 1.1;
  if (theme === "Technic") return 1.15;
  return 1.0;
}

function conditionMultiplier(condition: SimulationCondition): number {
  return condition === "sealed" ? 1 : 0.75;
}

export function estimateRetirementYear(set: LegoSet): number {
  if (isSetRetired(set)) {
    if (set.year <= 2020) return set.year + 3;
    return set.year + 2;
  }
  if (set.retiringSoon) return CURRENT_YEAR;
  return set.year + 4;
}

function yearsSinceRetirement(year: number, retirementYear: number): number {
  if (year < retirementYear) return -1;
  return year - retirementYear;
}

function baseAppreciationRate(
  year: number,
  retirementYear: number,
  isRetiredCatalogue: boolean,
): number {
  const yrs = yearsSinceRetirement(year, retirementYear);

  if (yrs < 0) {
    return 0.035;
  }
  if (yrs === 0) {
    return 0.3;
  }
  if (yrs === 1) {
    return 0.175;
  }
  if (yrs === 2) {
    return 0.125;
  }
  if (yrs === 3) {
    return 0.1;
  }
  if (yrs === 4 || yrs === 5) {
    return 0.065;
  }
  if (!isRetiredCatalogue && year >= retirementYear) {
    return 0.05;
  }
  return 0.04;
}

function computeCagr(
  initial: number,
  final: number,
  years: number,
): number {
  if (years <= 0 || initial <= 0) return 0;
  return (Math.pow(final / initial, 1 / years) - 1) * 100;
}

function gradeFromCagr(cagr: number): InvestmentGrade {
  if (cagr >= 20) return "S";
  if (cagr >= 15) return "A";
  if (cagr >= 10) return "B";
  if (cagr >= 5) return "C";
  return "D";
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function applyMilestones(returns: AnnualReturn[]): AnnualReturn[] {
  const initial = returns[0]?.value ?? 0;
  let peakYoy = -Infinity;
  let peakYoyYear = returns[0]?.year ?? 0;

  const withYoy = returns.map((row, i) => {
    if (i === 0) return { ...row };
    const prev = returns[i - 1].value;
    const yoy = prev > 0 ? ((row.value - prev) / prev) * 100 : 0;
    if (yoy > peakYoy) {
      peakYoy = yoy;
      peakYoyYear = row.year;
    }
    return { ...row, yoyPercent: Math.round(yoy * 10) / 10 };
  });

  return withYoy.map((row) => {
    const events: string[] = [];
    if (row.event) events.push(row.event);
    if (row.year === peakYoyYear && peakYoy > 5) {
      events.push("📈 Peak Growth Year");
    }
    if (initial > 0 && row.value >= initial * 3 && !events.some((e) => e.includes("3x"))) {
      events.push("🏆 3x Value Milestone");
    } else if (
      initial > 0 &&
      row.value >= initial * 2 &&
      !events.some((e) => e.includes("2x"))
    ) {
      events.push("💰 2x Value Milestone");
    }
    return {
      ...row,
      event: events.length ? events.join(" · ") : row.event,
    };
  });
}

export function simulateInvestment(
  setNumber: string,
  options: {
    initialInvestment: number;
    startYear: number;
    condition: SimulationCondition;
    currentYear?: number;
  },
): SimulationResult | null {
  const set = findSet(setNumber);
  if (!set) return null;

  const currentYear = options.currentYear ?? CURRENT_YEAR;
  if (options.startYear >= currentYear) return null;

  const retirementYear = estimateRetirementYear(set);
  const themeMult = themeMultiplier(set.theme);
  const condMult = conditionMultiplier(options.condition);
  const isRetired = isSetRetired(set);

  const pricing = set.pricing[options.condition];
  const catalogueValue = pricing?.estimatedValue ?? set.pricing.sealed.estimatedValue;

  const annualReturns: AnnualReturn[] = [];
  let value = options.initialInvestment;
  const yoyRates: number[] = [];

  annualReturns.push({
    year: options.startYear,
    value: Math.round(value),
  });

  for (let year = options.startYear + 1; year <= currentYear; year++) {
    const baseRate = baseAppreciationRate(year, retirementYear, isRetired);
    const rate = baseRate * themeMult * condMult;
    const prev = value;
    value = value * (1 + rate);
    yoyRates.push(rate * 100);

    let event: string | undefined;
    if (year === retirementYear) {
      event = "🔴 Set Retired";
    }

    annualReturns.push({
      year,
      value: Math.round(value),
      event,
    });
  }

  const holdingYears = currentYear - options.startYear;
  let modelEnd = annualReturns[annualReturns.length - 1]?.value ?? value;

  if (catalogueValue > 0 && options.initialInvestment > 0) {
    const impliedMultiple = catalogueValue / Math.max(set.msrp, 1);
    const targetFromMsrp = options.initialInvestment * impliedMultiple;
    const blend = Math.min(1, holdingYears / 8);
    modelEnd = Math.round(modelEnd * (1 - blend * 0.35) + targetFromMsrp * blend * 0.35);
    annualReturns[annualReturns.length - 1] = {
      ...annualReturns[annualReturns.length - 1],
      value: modelEnd,
    };
  }

  const withMilestones = applyMilestones(annualReturns);
  let peakValue = 0;
  let peakYear = options.startYear;
  for (const row of withMilestones) {
    if (row.value > peakValue) {
      peakValue = row.value;
      peakYear = row.year;
    }
  }

  const totalReturn = modelEnd - options.initialInvestment;
  const totalReturnPercent =
    options.initialInvestment > 0
      ? (totalReturn / options.initialInvestment) * 100
      : 0;
  const cagr = computeCagr(
    options.initialInvestment,
    modelEnd,
    holdingYears,
  );
  const volatilityScore = Math.round(stdDev(yoyRates) * 10) / 10;

  return {
    setNumber: set.number,
    setName: set.name,
    initialInvestment: options.initialInvestment,
    startYear: options.startYear,
    currentYear,
    holdingYears,
    estimatedCurrentValue: modelEnd,
    totalReturn,
    totalReturnPercent: Math.round(totalReturnPercent * 10) / 10,
    cagr: Math.round(cagr * 10) / 10,
    annualReturns: withMilestones,
    peakValue,
    peakYear,
    volatilityScore,
    grade: gradeFromCagr(cagr),
    estimatedRetirementYear: retirementYear,
    theme: set.theme,
  };
}

export function runBattleSimulation(params: {
  setA: string;
  setB: string;
  initialInvestment: number;
  startYear: number;
  conditionA: SimulationCondition;
  conditionB: SimulationCondition;
}): BattleComparison | null {
  const resultA = simulateInvestment(params.setA, {
    initialInvestment: params.initialInvestment,
    startYear: params.startYear,
    condition: params.conditionA,
  });
  const resultB = simulateInvestment(params.setB, {
    initialInvestment: params.initialInvestment,
    startYear: params.startYear,
    condition: params.conditionB,
  });
  if (!resultA || !resultB) return null;

  const returnDiff = Math.abs(
    resultA.totalReturnPercent - resultB.totalReturnPercent,
  );
  let winner: "a" | "b" | "tie" = "tie";
  if (returnDiff > 10) {
    winner =
      resultA.totalReturnPercent > resultB.totalReturnPercent ? "a" : "b";
  }

  return {
    resultA,
    resultB,
    winner,
    whatThisMeans: buildWhatThisMeans(resultA, resultB),
    strategyInsights: buildStrategyInsights(resultA, resultB),
  };
}

function buildWhatThisMeans(
  a: SimulationResult,
  b: SimulationResult,
): string[] {
  const insights: string[] = [];
  const avgCagr = BENCHMARK_CAGR.averageLego;
  const beatA = a.cagr - avgCagr;
  insights.push(
    `${a.setName} has delivered ${a.cagr}% CAGR since ${a.startYear} — ${beatA >= 0 ? "outperforming" : "underperforming"} the average LEGO set by ${Math.abs(Math.round(beatA))}%.`,
  );

  const retirementSpike = a.annualReturns.find(
    (r) => r.event?.includes("Retired") && r.yoyPercent && r.yoyPercent > 15,
  );
  if (retirementSpike?.yoyPercent) {
    insights.push(
      `The retirement spike in ${retirementSpike.year} added roughly ${Math.round(retirementSpike.yoyPercent)}% in a single year for ${a.setName}.`,
    );
  }

  if (b.volatilityScore > a.volatilityScore + 5) {
    insights.push(
      `${b.setName} has been more volatile but delivered ${b.totalReturnPercent >= a.totalReturnPercent ? "stronger" : "mixed"} peak returns (peak ${b.peakYear}: $${b.peakValue.toLocaleString()}).`,
    );
  } else if (a.volatilityScore > b.volatilityScore + 5) {
    insights.push(
      `${a.setName} has been more volatile than ${b.setName} — watch for retirement-year swings.`,
    );
  }

  const sellAtPeakA = a.peakValue - a.estimatedCurrentValue;
  if (sellAtPeakA > a.initialInvestment * 0.1 && a.peakYear < a.currentYear) {
    insights.push(
      `If you had sold ${a.setName} at peak in ${a.peakYear} you would have made $${Math.round(sellAtPeakA).toLocaleString()} more than holding to today.`,
    );
  }

  return insights.slice(0, 4);
}

function buildStrategyInsights(
  a: SimulationResult,
  b: SimulationResult,
): string[] {
  const insights: string[] = [];

  const preRetireYears = a.annualReturns.filter(
    (r) => r.year < a.estimatedRetirementYear,
  );
  const bestEntry = preRetireYears.reduce(
    (best, row) => (row.value < best.value ? row : best),
    preRetireYears[0] ?? a.annualReturns[0],
  );
  if (bestEntry) {
    insights.push(
      `Best entry point for ${a.setName}: buying around ${bestEntry.year} before retirement would have maximised returns in this model.`,
    );
  }

  const retireRow = a.annualReturns.find((r) => r.year === a.estimatedRetirementYear);
  const preRetireValue =
    a.annualReturns.find((r) => r.year === a.estimatedRetirementYear - 1)
      ?.value ?? a.initialInvestment;
  if (retireRow && preRetireValue > 0) {
    const holdBoost =
      ((retireRow.value - preRetireValue) / preRetireValue) * 100;
    insights.push(
      `Holding ${a.setName} through retirement added approximately ${Math.round(holdBoost)}% vs selling the year before (modelled).`,
    );
  }

  const modularCagr =
    a.theme === "Modular" ? a.cagr : b.theme === "Modular" ? b.cagr : null;
  const ceCagr =
    a.theme === "Creator Expert"
      ? a.cagr
      : b.theme === "Creator Expert"
        ? b.cagr
        : null;
  if (modularCagr !== null && ceCagr !== null) {
    const diff = Math.abs(modularCagr - ceCagr);
    const leader = modularCagr >= ceCagr ? "Modular" : "Creator Expert";
    insights.push(
      `Theme comparison: ${leader} sets have historically outperformed in this simulation by ~${Math.round(diff)}% CAGR.`,
    );
  } else {
    insights.push(
      `Theme comparison: ${a.theme} (${a.cagr}% CAGR) vs ${b.theme} (${b.cagr}% CAGR) in this battle.`,
    );
  }

  return insights.slice(0, 3);
}

export function formatSimulationSummary(
  battle: BattleComparison,
): string {
  const { resultA: a, resultB: b } = battle;
  return `LEGO Investment Simulator Results
Set A: ${a.setName} — $${a.initialInvestment.toLocaleString()} → $${a.estimatedCurrentValue.toLocaleString()} (+${a.totalReturnPercent}%, ${a.cagr}% CAGR) Grade: ${a.grade}
Set B: ${b.setName} — $${b.initialInvestment.toLocaleString()} → $${b.estimatedCurrentValue.toLocaleString()} (+${b.totalReturnPercent}%, ${b.cagr}% CAGR) Grade: ${b.grade}
Simulated ${a.startYear}-${a.currentYear} · via BrickValue`;
}

export function gradeBadgeClass(grade: InvestmentGrade): string {
  switch (grade) {
    case "S":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "A":
      return "bg-green-500/20 text-green-300 border-green-500/40";
    case "B":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "C":
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    default:
      return "bg-red-500/20 text-red-300 border-red-500/40";
  }
}
