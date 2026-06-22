"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useIsPro } from "@/src/hooks/useIsPro";

interface ProGateProps {
  children: ReactNode;
  feature?: string;
}

export default function ProGate({ children, feature }: ProGateProps) {
  const { isPro, isLoading } = useIsPro();

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-xl bg-white/5" />;
  }

  if (!isPro) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <div className="mb-2 text-2xl">🔒</div>
        <h3 className="mb-1 font-bold text-white">Pro Feature</h3>
        <p className="mb-4 text-sm text-white/50">
          {feature || "This feature"} is available on BrickValue Pro
        </p>
        <Link
          href="/pricing"
          className="inline-block rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-black"
        >
          Upgrade to Pro →
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
