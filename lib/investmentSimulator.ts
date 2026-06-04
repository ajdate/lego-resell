import { findSet, isSetRetired, type Condition, type LegoSet } from "@/lib/analyze";

export type SimulationCondition = Extract<Condition, "sealed" | "complete">;
export type InvestmentGrade = "S" | "A" | "B" | "C" | "D";
export const AU_CPI_AVG = 3.2;

export interface AnnualReturn {
  year: number;
  value: number;
  yoyPercent?: number;
  event?: string;
}

export interface SellScenario {
  label: string;
  year: number;
  value: number;
  returnPercent: number;
}

export interface SimulationResult {
  setNumber: string;
  setName: string;
  condition: SimulationCondition;
  initialInvestment: number;
  copies: number;
  perCopyInvestment: number;
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
  retirementContributionPercent: number;
  sellScenarios: SellScenario[];
  optimalSell: SellScenario;
  opportunityCostToToday: number;
}

export interface BattleComparison {
  resultA: SimulationResult;
  resultB: SimulationResult;
  winner: "a" | "b" | "tie";
  whatThisMeans: string[];
  strategyInsights: string[];
}

export const SIMULATOR_START_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021] as const;

export const BENCHMARK_CAGR = {
  averageLego: 8,
  premiumLego: 15,
  australianProperty: 7,
  asx200: 9,
  gold: 8,
  bitcoin: 45,
} as const;

export const QUICK_BATTLES = [
  { id: "modular-classic", title: "Modular Classic Battle", subtitle: "Cafe Corner vs Green Grocer", setA: "10182", setB: "10185", startYear: 2018 },
  { id: "ucs-showdown", title: "UCS Showdown", subtitle: "Millennium Falcon vs Imperial Star Destroyer", setA: "75192", setB: "75252", startYear: 2019 },
  { id: "creator-expert", title: "Creator Expert Clash", subtitle: "Aston Martin vs Porsche 911", setA: "10262", setB: "42056", startYear: 2018 },
  { id: "ideas-battle", title: "Ideas Battle", subtitle: "Saturn V vs Central Perk", setA: "21309", setB: "21319", startYear: 2018 },
  { id: "vintage-modern", title: "Vintage vs Modern", subtitle: "Green Grocer vs Bookshop", setA: "10185", setB: "10270", startYear: 2017 },
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
  if (isSetRetired(set)) return set.year <= 2020 ? set.year + 3 : set.year + 2;
  if (set.retiringSoon) return CURRENT_YEAR;
  return set.year + 4;
}

function baseAppreciationRate(year: number, retirementYear: number, isRetiredCatalogue: boolean): number {
  const yrs = year - retirementYear;
  if (yrs < 0) return 0.035;
  if (yrs === 0) return 0.3;
  if (yrs === 1) return 0.175;
  if (yrs === 2) return 0.125;
  if (yrs === 3) return 0.1;
  if (yrs === 4 || yrs === 5) return 0.065;
  if (!isRetiredCatalogue && year >= retirementYear) return 0.05;
  return 0.04;
}

function computeCagr(initial: number, final: number, years: number): number {
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
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function applyMilestones(returns: AnnualReturn[]): AnnualReturn[] {
  const initial = returns[0]?.value ?? 0;
  let peakYoy = -Infinity;
  let peakYoyYear = returns[0]?.year ?? 0;
  const doubledAdded = { done: false };
  const tripledAdded = { done: false };

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
    const events: string[] = row.event ? [row.event] : [];
    if (row.year === peakYoyYear && peakYoy > 5) events.push("📈 Peak Growth Year");
    if (!tripledAdded.done && initial > 0 && row.value >= initial * 3) {
      tripledAdded.done = true;
      events.push("🏆 3x Value Milestone");
    } else if (!doubledAdded.done && initial > 0 && row.value >= initial * 2) {
      doubledAdded.done = true;
      events.push("💰 2x Value Milestone");
    }
    return { ...row, event: events.length ? events.join(" · ") : undefined };
  });
}

function buildSellScenarios(result: {
  annualReturns: AnnualReturn[];
  retirementYear: number;
  currentYear: number;
  initialInvestment: number;
}) {
  const byYear = new Map(result.annualReturns.map((r) => [r.year, r.value]));
  const scenarios: SellScenario[] = [];

  const checkpoints = [
    { label: "Sold at retirement", year: result.retirementYear },
    { label: "Sold 1 year after", year: result.retirementYear + 1 },
    { label: "Sold 2 years after", year: result.retirementYear + 2 },
    { label: "Held to today", year: result.currentYear },
  ];

  for (const cp of checkpoints) {
    const year = Math.min(result.currentYear, cp.year);
    const value = byYear.get(year) ?? byYear.get(result.currentYear) ?? result.initialInvestment;
    const returnPercent = ((value - result.initialInvestment) / Math.max(1, result.initialInvestment)) * 100;
    scenarios.push({
      label: cp.label,
      year,
      value: Math.round(value),
      returnPercent: Math.round(returnPercent * 10) / 10,
    });
  }

  let optimal = scenarios[0];
  for (const s of scenarios) if (s.value > optimal.value) optimal = s;
  const held = scenarios[scenarios.length - 1];
  const retirement = scenarios[0];
  const opportunityCostToToday = Math.max(0, held.value - retirement.value);

  return { scenarios, optimal, opportunityCostToToday };
}

export function toRealValue(nominal: number, years: number, cpi = AU_CPI_AVG): number {
  const factor = Math.pow(1 + cpi / 100, years);
  return nominal / Math.max(1, factor);
}

export function volatilityLabel(score: number): "Low" | "Medium" | "High" {
  if (score < 10) return "Low";
  if (score <= 20) return "Medium";
  return "High";
}

export type RetirementVelocityLabel = "High Velocity" | "Medium" | "Low";

export interface RetirementImpactMetrics {
  retirementYear: number;
  preRetirementAvgPercent: number;
  retirementSpikePercent: number;
  postRetirementAvgPercent: number;
  postRetirementYears: number;
  retirementContributionPercent: number;
  holdingPremiumDollars: number;
  holdingPremiumPercent: number;
  peakAfterRetirementYears: number;
  velocityRatio: number;
  velocityLabel: RetirementVelocityLabel;
  estimatedRetirementValue: number;
  estimatedTwoYearsPostValue: number;
}

export function retirementProbabilityForActive(setYear: number, currentYear = CURRENT_YEAR): {
  label: "High" | "Medium" | "Low-Medium" | "Low";
  reason: string;
  colorClass: string;
  window: string;
} {
  const age = Math.max(0, currentYear - setYear);
  if (age >= 4) {
    return {
      label: "High",
      reason: `set is ${age}+ years old`,
      colorClass: "text-red-400",
      window: "Within 12 months",
    };
  }
  if (age === 3) {
    return {
      label: "Medium",
      reason: "set is 3 years old",
      colorClass: "text-amber-400",
      window: "Within 12-24 months",
    };
  }
  if (age === 2) {
    return {
      label: "Low-Medium",
      reason: "set is 2 years old",
      colorClass: "text-zinc-300",
      window: "Likely 2-3 years",
    };
  }
  return {
    label: "Low",
    reason: "newer set lifecycle",
    colorClass: "text-zinc-400",
    window: "Likely 3+ years",
  };
}

export function projectValueYearsAhead(
  setNumber: string,
  condition: SimulationCondition,
  currentValue: number,
  yearsAhead: number,
): number {
  const set = findSet(setNumber);
  if (!set) return currentValue;
  const retirementYear = estimateRetirementYear(set);
  const themeMult = themeMultiplier(set.theme);
  const condMult = conditionMultiplier(condition);
  const isRetired = isSetRetired(set);
  let value = currentValue;
  for (let i = 1; i <= yearsAhead; i++) {
    const year = CURRENT_YEAR + i;
    const rate = baseAppreciationRate(year, retirementYear, isRetired) * themeMult * condMult;
    value *= 1 + rate;
  }
  return Math.round(value);
}

export function getRetirementImpactMetrics(result: SimulationResult): RetirementImpactMetrics {
  const yoyRows = result.annualReturns.filter((r) => r.yoyPercent != null);
  const preRows = yoyRows.filter((r) => r.year < result.estimatedRetirementYear);
  const spikeRow = yoyRows.find((r) => r.year === result.estimatedRetirementYear);
  const postRows = yoyRows.filter((r) => r.year > result.estimatedRetirementYear);
  const preAvg =
    preRows.length > 0
      ? preRows.reduce((s, r) => s + (r.yoyPercent ?? 0), 0) / preRows.length
      : 0;
  const spike = spikeRow?.yoyPercent ?? 0;
  const postAvg =
    postRows.length > 0
      ? postRows.reduce((s, r) => s + (r.yoyPercent ?? 0), 0) / postRows.length
      : 0;
  const preSell = result.annualReturns.find((r) => r.year === result.estimatedRetirementYear - 1)?.value ?? result.initialInvestment;
  const hold = result.estimatedCurrentValue;
  const holdingPremiumDollars = Math.max(0, hold - preSell);
  const holdingPremiumPercent = preSell > 0 ? ((hold - preSell) / preSell) * 100 : 0;
  const peakAfterRetirementYears = Math.max(0, result.peakYear - result.estimatedRetirementYear);
  const velocityRatio = preAvg > 0 ? spike / preAvg : 0;
  const velocityLabel: RetirementVelocityLabel =
    velocityRatio > 4 ? "High Velocity" : velocityRatio >= 2 ? "Medium" : "Low";
  const retirementValue = result.annualReturns.find((r) => r.year === result.estimatedRetirementYear)?.value ?? result.estimatedCurrentValue;
  const post2 = result.annualReturns.find((r) => r.year === result.estimatedRetirementYear + 2)?.value ?? result.estimatedCurrentValue;

  return {
    retirementYear: result.estimatedRetirementYear,
    preRetirementAvgPercent: Math.round(preAvg * 10) / 10,
    retirementSpikePercent: Math.round(spike * 10) / 10,
    postRetirementAvgPercent: Math.round(postAvg * 10) / 10,
    postRetirementYears: postRows.length,
    retirementContributionPercent: result.retirementContributionPercent,
    holdingPremiumDollars: Math.round(holdingPremiumDollars),
    holdingPremiumPercent: Math.round(holdingPremiumPercent * 10) / 10,
    peakAfterRetirementYears,
    velocityRatio: Math.round(velocityRatio * 10) / 10,
    velocityLabel,
    estimatedRetirementValue: retirementValue,
    estimatedTwoYearsPostValue: post2,
  };
}

export function simulateInvestment(
  setNumber: string,
  options: {
    initialInvestment: number;
    startYear: number;
    condition: SimulationCondition;
    copies?: number;
    currentYear?: number;
  },
): SimulationResult | null {
  const set = findSet(setNumber);
  if (!set) return null;

  const currentYear = options.currentYear ?? CURRENT_YEAR;
  if (options.startYear >= currentYear) return null;

  const copies = Math.min(10, Math.max(1, options.copies ?? 1));
  const initialInvestment = options.initialInvestment;
  const perCopyInvestment = initialInvestment / copies;
  const retirementYear = estimateRetirementYear(set);
  const themeMult = themeMultiplier(set.theme);
  const condMult = conditionMultiplier(options.condition);
  const isRetired = isSetRetired(set);
  const pricing = set.pricing[options.condition];
  const catalogueValue = pricing?.estimatedValue ?? set.pricing.sealed.estimatedValue;

  const annualReturns: AnnualReturn[] = [{ year: options.startYear, value: Math.round(initialInvestment) }];
  const yoyRates: number[] = [];
  let value = initialInvestment;
  let retirementSpikeAmount = 0;

  for (let year = options.startYear + 1; year <= currentYear; year++) {
    const baseRate = baseAppreciationRate(year, retirementYear, isRetired);
    const rate = baseRate * themeMult * condMult;
    const prev = value;
    value = value * (1 + rate);
    yoyRates.push(rate * 100);

    if (year === retirementYear) retirementSpikeAmount = value - prev;
    annualReturns.push({
      year,
      value: Math.round(value),
      event: year === retirementYear ? "🔴 Set Retired" : undefined,
    });
  }

  const holdingYears = currentYear - options.startYear;
  let modelEnd = annualReturns[annualReturns.length - 1]?.value ?? value;
  if (catalogueValue > 0 && initialInvestment > 0) {
    const impliedMultiple = catalogueValue / Math.max(set.msrp, 1);
    const targetFromMsrp = initialInvestment * impliedMultiple;
    const blend = Math.min(1, holdingYears / 8);
    modelEnd = Math.round(modelEnd * (1 - blend * 0.35) + targetFromMsrp * blend * 0.35);
    annualReturns[annualReturns.length - 1] = { ...annualReturns[annualReturns.length - 1], value: modelEnd };
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

  const totalReturn = modelEnd - initialInvestment;
  const totalReturnPercent = initialInvestment > 0 ? (totalReturn / initialInvestment) * 100 : 0;
  const cagr = computeCagr(initialInvestment, modelEnd, holdingYears);
  const volatilityScore = Math.round(stdDev(yoyRates) * 10) / 10;
  const retirementContributionPercent = totalReturn > 0 ? Math.max(0, (retirementSpikeAmount / totalReturn) * 100) : 0;

  const { scenarios, optimal, opportunityCostToToday } = buildSellScenarios({
    annualReturns: withMilestones,
    retirementYear,
    currentYear,
    initialInvestment,
  });

  return {
    setNumber: set.number,
    setName: set.name,
    condition: options.condition,
    initialInvestment,
    copies,
    perCopyInvestment,
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
    retirementContributionPercent: Math.round(retirementContributionPercent * 10) / 10,
    sellScenarios: scenarios,
    optimalSell: optimal,
    opportunityCostToToday,
  };
}

export function runBattleSimulation(params: {
  setA: string;
  setB: string;
  initialInvestment: number;
  startYear: number;
  conditionA: SimulationCondition;
  conditionB: SimulationCondition;
  copiesA?: number;
  copiesB?: number;
}): BattleComparison | null {
  const resultA = simulateInvestment(params.setA, {
    initialInvestment: params.initialInvestment,
    startYear: params.startYear,
    condition: params.conditionA,
    copies: params.copiesA,
  });
  const resultB = simulateInvestment(params.setB, {
    initialInvestment: params.initialInvestment,
    startYear: params.startYear,
    condition: params.conditionB,
    copies: params.copiesB,
  });
  if (!resultA || !resultB) return null;

  const returnDiff = Math.abs(resultA.totalReturnPercent - resultB.totalReturnPercent);
  const winner = returnDiff > 10 ? (resultA.totalReturnPercent > resultB.totalReturnPercent ? "a" : "b") : "tie";
  return {
    resultA,
    resultB,
    winner,
    whatThisMeans: buildWhatThisMeans(resultA, resultB),
    strategyInsights: buildStrategyInsights(resultA, resultB),
  };
}

function buildWhatThisMeans(a: SimulationResult, b: SimulationResult): string[] {
  const avg = BENCHMARK_CAGR.averageLego;
  return [
    `${a.setName} has delivered ${a.cagr}% CAGR since ${a.startYear} — ${(a.cagr - avg) >= 0 ? "outperforming" : "underperforming"} the average LEGO set by ${Math.abs(Math.round(a.cagr - avg))}%.`,
    `${a.setName} retirement-year spike contributed about ${Math.round(a.retirementContributionPercent)}% of total returns.`,
    `${b.setName} ${b.volatilityScore > a.volatilityScore ? "has been more volatile" : "has been steadier"} across the holding period.`,
  ];
}

function buildStrategyInsights(a: SimulationResult, b: SimulationResult): string[] {
  const retire = a.sellScenarios[0];
  const today = a.sellScenarios[a.sellScenarios.length - 1];
  const holdBoost = retire && today && retire.value > 0 ? ((today.value - retire.value) / retire.value) * 100 : 0;
  return [
    `Best entry point: buying before ${a.estimatedRetirementYear} maximised modeled upside for ${a.setName}.`,
    `Holding through retirement added approximately ${Math.round(holdBoost)}% vs selling at retirement.`,
    `Theme comparison: ${a.theme} (${a.cagr}% CAGR) vs ${b.theme} (${b.cagr}% CAGR) in this simulation.`,
  ];
}

export function realReturnPercent(result: SimulationResult, cpi = AU_CPI_AVG): number {
  const realEnd = toRealValue(result.estimatedCurrentValue, result.holdingYears, cpi);
  return Math.round((((realEnd - result.initialInvestment) / Math.max(1, result.initialInvestment)) * 100) * 10) / 10;
}

export function formatSimulationSummary(
  result: SimulationResult,
  opts?: { inflationAdjusted?: boolean },
): string {
  const real = realReturnPercent(result);
  return `📊 LEGO Investment Simulation — BrickValue

Set: ${result.setName} (#${result.setNumber}) · ${result.condition === "sealed" ? "Sealed" : "Complete"}
Investment: $${Math.round(result.perCopyInvestment)} AUD in ${result.startYear}${result.copies > 1 ? ` (${result.copies} copies)` : ""}
Current Value: $${result.estimatedCurrentValue.toLocaleString()} AUD
Total Return: +$${Math.round(result.totalReturn).toLocaleString()} (+${result.totalReturnPercent}%)
CAGR: ${result.cagr}% per year
Grade: ${result.grade}

Inflation-adjusted return: +${real}%
vs Average LEGO set: +${BENCHMARK_CAGR.averageLego}% CAGR
vs ASX 200: +${BENCHMARK_CAGR.asx200}% CAGR

Simulate your LEGO investment at https://brickvalue.app/simulator`;
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
