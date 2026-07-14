"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/is-native-app";

export default function ProSuccessPage() {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  if (native) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold text-white">BrickValue Pro</h1>
          <p className="mb-8 text-sm text-white/60">
            Visit brickvalue.app on desktop to upgrade to Pro
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-amber-500 px-8 py-3 font-bold text-black"
          >
            Back to BrickValue →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">🎉</div>
        <h1 className="mb-3 text-3xl font-bold text-white">
          Welcome to BrickValue Pro!
        </h1>
        <p className="mb-8 text-white/60">
          Your subscription is active. All Pro features are now unlocked.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-amber-500 px-8 py-3 font-bold text-black"
        >
          Start Exploring →
        </Link>
      </div>
    </div>
  );
}
