export const ONBOARDING_COMPLETE_KEY = "lego-onboarding-complete";
export const USER_GOAL_KEY = "lego-user-goal";

export type UserGoal =
  | "investor"
  | "collector"
  | "learner"
  | "seller"
  | "researcher"
  | "general";

export type GoalOption = {
  id: Exclude<UserGoal, "general">;
  icon: string;
  title: string;
  description: string;
};

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "investor",
    icon: "🔥",
    title: "Find investment opportunities",
    description: "Discover which sets to buy, hold or sell right now",
  },
  {
    id: "collector",
    icon: "📦",
    title: "Track sets I own",
    description: "Build a portfolio and monitor your collection value",
  },
  {
    id: "learner",
    icon: "🎓",
    title: "Learn LEGO investing",
    description: "Understand retirement cycles, market timing and appreciation",
  },
  {
    id: "seller",
    icon: "💰",
    title: "Calculate profit on a sale",
    description: "Work out real net profit after fees and costs",
  },
  {
    id: "researcher",
    icon: "⚖️",
    title: "Compare two sets",
    description: "Head-to-head comparison to make smarter decisions",
  },
];

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
}

export function getUserGoal(): UserGoal | null {
  if (typeof window === "undefined") return null;
  const goal = localStorage.getItem(USER_GOAL_KEY);
  if (
    goal === "investor" ||
    goal === "collector" ||
    goal === "learner" ||
    goal === "seller" ||
    goal === "researcher" ||
    goal === "general"
  ) {
    return goal;
  }
  return null;
}

export function setUserGoal(goal: UserGoal): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_GOAL_KEY, goal);
}

export function completeOnboarding(goal: UserGoal): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  setUserGoal(goal);
}

export function skipOnboarding(): void {
  completeOnboarding("general");
}

export function clearOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

export function getGoalModeLabel(goal: UserGoal | null): string {
  switch (goal) {
    case "investor":
      return "Investor";
    case "collector":
      return "Collector";
    case "learner":
      return "Learner";
    case "seller":
      return "Seller";
    case "researcher":
      return "Researcher";
    default:
      return "General";
  }
}

export function isPersonalizedGoal(goal: UserGoal | null): goal is Exclude<UserGoal, "general"> {
  return (
    goal === "investor" ||
    goal === "collector" ||
    goal === "learner" ||
    goal === "seller" ||
    goal === "researcher"
  );
}
