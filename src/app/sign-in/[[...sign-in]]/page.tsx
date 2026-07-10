"use client";

import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  clerkAuthAppearance,
  clerkAuthOAuthProps,
} from "@/lib/clerk-auth-appearance";

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-sm text-white/40"
            style={{ touchAction: "manipulation" }}
          >
            ← Back
          </button>
          <img
            src="/brickvalue-wordmark.png"
            alt="BrickValue"
            className="h-10 object-contain"
          />
          <div className="w-12" />
        </div>
        <SignIn
          appearance={clerkAuthAppearance}
          signUpUrl="/sign-up"
          {...clerkAuthOAuthProps}
        />
      </div>
    </div>
  );
}
