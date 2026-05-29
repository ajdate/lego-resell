"use client";

import type { GoalOption, UserGoal } from "@/lib/onboarding";
import { GOAL_OPTIONS } from "@/lib/onboarding";

type GoalSelectorProps = {
  selected: Exclude<UserGoal, "general"> | null;
  onSelect: (goal: Exclude<UserGoal, "general">) => void;
};

export function GoalSelector({ selected, onSelect }: GoalSelectorProps) {
  return (
    <div className="space-y-3">
      {GOAL_OPTIONS.map((option: GoalOption) => {
        const isSelected = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
              isSelected
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-white/8 bg-white/[0.03] hover:border-amber-500/20 hover:bg-white/[0.05]"
            }`}
          >
            <p className="text-lg">{option.icon}</p>
            <p className="mt-1 text-base font-bold text-white">{option.title}</p>
            <p className="mt-1 text-sm text-white/50">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
