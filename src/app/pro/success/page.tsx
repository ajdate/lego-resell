"use client";

import Link from "next/link";

export default function ProSuccessPage() {
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
