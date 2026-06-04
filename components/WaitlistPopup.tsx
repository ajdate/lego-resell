"use client";

import { useEffect, useState } from "react";
import {
  hasWaitlistBeenShown,
  markWaitlistShown,
  openWaitlistInNewTab,
} from "@/lib/waitlist";

export function WaitlistPopup({ listingReady }: { listingReady: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!listingReady || hasWaitlistBeenShown()) return;

    const timer = window.setTimeout(() => {
      if (!hasWaitlistBeenShown()) {
        setVisible(true);
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [listingReady]);

  function close() {
    markWaitlistShown();
    setVisible(false);
  }

  function handleJoin() {
    openWaitlistInNewTab();
    close();
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="early-access-popup-title"
    >
      <div className="relative mt-24 w-full max-w-sm rounded-2xl border border-amber-500/30 bg-[#111111] p-6 shadow-xl shadow-black/40 sm:mt-32">
        <button
          type="button"
          onClick={close}
          className="touch-target absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
        <h2
          id="early-access-popup-title"
          className="pr-8 text-xl font-bold text-white"
        >
          Like what you see? 👋
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          BrickValue is free during beta. Sign up for early access and get 3
          months of Pro features free when paid plans launch.
        </p>
        <button
          type="button"
          onClick={handleJoin}
          className="touch-target mt-6 w-full rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] py-3.5 text-sm font-black text-black transition hover:from-[#fbbf24] hover:to-[#f59e0b]"
        >
          Get Early Access →
        </button>
        <button
          type="button"
          onClick={close}
          className="mt-3 w-full text-center text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
