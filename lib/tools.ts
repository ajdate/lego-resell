export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
};

export const TOOLS: ToolDefinition[] = [
  {
    id: "opportunities",
    name: "Opportunities",
    description: "Find the strongest buy signals across all sets",
    href: "/opportunities",
    icon: "🔥",
  },
  {
    id: "retiring-soon",
    name: "Retiring Soon",
    description: "Sets approaching retirement — act before supply drops",
    href: "/retiring-soon",
    icon: "⚠️",
  },
  {
    id: "compare",
    name: "Compare Sets",
    description: "Compare two sets side by side across all metrics",
    href: "/compare",
    icon: "⚖️",
  },
  {
    id: "profit-calculator",
    name: "Profit Calculator",
    description: "Calculate real net profit after fees and costs",
    href: "/profit-calculator",
    icon: "💰",
  },
  {
    id: "simulator",
    name: "Simulator",
    description: "Simulate historical investment performance",
    href: "/simulator",
    icon: "📈",
  },
  {
    id: "risk-reward",
    name: "Risk vs Reward",
    description: "Visualise risk and return across LEGO sets",
    href: "/risk-reward",
    icon: "🎯",
  },
  {
    id: "benchmark",
    name: "Benchmark",
    description: "Compare LEGO returns against traditional investments",
    href: "/benchmark",
    icon: "📊",
  },
  {
    id: "battles",
    name: "Battles",
    description: "Quick investment battles — tap and explore",
    href: "/battles",
    icon: "⚔️",
  },
  {
    id: "portfolio-fit",
    name: "Portfolio Fit",
    description: "See how a set fits your existing portfolio",
    href: "/portfolio-fit",
    icon: "🧩",
  },
  {
    id: "portfolio-analytics",
    name: "Portfolio Analytics",
    description: "Deep insights into your collection performance",
    href: "/portfolio/analytics",
    icon: "📈",
  },
  {
    id: "growth",
    name: "Growth Tracker",
    description: "Track how your portfolio value changes over time",
    href: "/growth",
    icon: "📅",
  },
  {
    id: "history",
    name: "History",
    description: "Your analysis history and recommendation changes",
    href: "/history",
    icon: "🕐",
  },
  {
    id: "browse",
    name: "Browse Sets",
    description: "Browse all sets by theme and category",
    href: "/browse",
    icon: "🔍",
  },
];

export const TOOL_PATHS = ["/tools", ...TOOLS.map((t) => t.href)] as const;

export function isToolPath(pathname: string): boolean {
  if (pathname === "/tools") return true;
  if (pathname.startsWith("/portfolio/analytics")) return true;
  return TOOLS.some(
    (tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`),
  );
}

export function getToolByPath(pathname: string): ToolDefinition | undefined {
  if (pathname === "/tools") {
    return {
      id: "tools",
      name: "Tools",
      description: "Advanced analysis and investment tools",
      href: "/tools",
      icon: "🛠",
    };
  }
  return TOOLS.find(
    (tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`),
  );
}

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.id === id);
}

export const FEATURED_WITH_PORTFOLIO = ["portfolio-fit", "simulator"] as const;
export const FEATURED_EMPTY_PORTFOLIO = ["opportunities", "compare"] as const;
