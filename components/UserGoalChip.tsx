"use client";

import { useEffect, useState } from "react";
import { GoalSelector } from "@/components/GoalSelector";
import {
  getGoalModeLabel,
  getUserGoal,
  setUserGoal,
  type UserGoal,
} from "@/lib/onboarding";

export function UserGoalChip() {
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Exclude<UserGoal, "general"> | null>(
    null,
  );

  useEffect(() => {
    setGoal(getUserGoal());
  }, []);

  if (!goal || goal === "general") return null;

  function handleSave() {
    if (!pending) return;
    setUserGoal(pending);
    setGoal(pending);
    setOpen(false);
    window.dispatchEvent(new Event("lego-goal-changed"));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPending(goal);
          setOpen(true);
        }}
        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/15"
      >
        Mode: {getGoalModeLabel(goal)}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Change your goal</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-white/40 hover:text-white"
              >
                Close
              </button>
            </div>
            <GoalSelector
              selected={pending}
              onSelect={(next) => setPending(next)}
            />
            <button
              type="button"
              disabled={!pending}
              onClick={handleSave}
              className="mt-4 w-full rounded-xl bg-[#f59e0b] py-3 text-sm font-bold text-zinc-900 transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save goal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
