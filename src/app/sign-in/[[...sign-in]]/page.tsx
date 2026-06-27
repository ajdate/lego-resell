"use client";

import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

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
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#111] border border-white/10 shadow-xl",
              headerTitle: "text-white",
              headerSubtitle: "text-white/60",
              socialButtonsBlockButton:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10",
              formFieldLabel: "text-white/70",
              formFieldInput: "bg-white/5 border border-white/10 text-white",
              footerActionLink: "text-amber-400",
              formButtonPrimary:
                "bg-amber-500 hover:bg-amber-400 text-black font-bold",
            },
          }}
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
