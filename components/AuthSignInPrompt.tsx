"use client";

import { SignInButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function AuthSignInPrompt({
  emoji,
  title,
  description,
  children,
}: {
  emoji: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center">
          <div className="mb-4 text-4xl">{emoji}</div>
          <h2 className="mb-2 text-xl font-bold text-white">{title}</h2>
          <p className="mb-6 text-sm text-white/50">{description}</p>
          <SignInButton mode="redirect">
            <button className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-black">
              Sign In to Continue
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
