"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { posthog } from "@/src/lib/posthog";

interface AuthWallProps {
  feature: string;
  description: string;
  icon: string;
}

export function AuthWall({ feature, description, icon }: AuthWallProps) {
  const router = useRouter();

  useEffect(() => {
    posthog.capture("auth_wall_viewed", { feature });
  }, [feature]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 pb-24">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 text-5xl">{icon}</div>
        <h2 className="mb-3 text-2xl font-bold text-white">{feature}</h2>
        <p className="mb-8 text-sm leading-relaxed text-white/50">{description}</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              posthog.capture("auth_wall_signup_clicked", { feature });
              router.push("/sign-up");
            }}
            style={{ touchAction: "manipulation" }}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black"
          >
            Create Free Account
          </button>
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            style={{ touchAction: "manipulation" }}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white"
          >
            Sign In
          </button>
        </div>

        <p className="mt-6 text-xs text-white/30">
          Free to use. No credit card required.
        </p>
      </div>
    </div>
  );
}
