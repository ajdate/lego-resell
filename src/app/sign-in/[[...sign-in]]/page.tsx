"use client";

import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clerkAuthAppearance,
  clerkAuthOAuthProps,
} from "@/lib/clerk-auth-appearance";
import { isNativeApp } from "@/lib/isNative";

export default function SignInPage() {
  const router = useRouter();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);

  function goHome() {
    if (isNative) {
      window.location.href = "/";
      return;
    }
    router.push("/");
  }

  async function handleNativeAppleSignIn() {
    const { nativeAppleSignIn } = await import("@/src/lib/nativeAppleSignIn");
    await nativeAppleSignIn();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={goHome}
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

        {isNative && (
          <button
            type="button"
            onClick={() => void handleNativeAppleSignIn()}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-black"
            style={{ touchAction: "manipulation" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
            </svg>
            Sign in with Apple
          </button>
        )}

        <SignIn
          appearance={clerkAuthAppearance}
          signUpUrl="/sign-up"
          routing="path"
          path="/sign-in"
          {...clerkAuthOAuthProps}
        />
      </div>
    </div>
  );
}
