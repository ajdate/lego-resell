"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "brickvalue-install-dismissed";

function isMobileSafari(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/i.test(ua);
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;

  return isIOS && isSafari && !isStandalone;
}

export function InstallAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobileSafari()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-start justify-between gap-3 rounded-xl border border-[#f59e0b]/30 bg-[#1a1a1a] px-4 py-3">
        <p className="text-xs leading-relaxed text-white sm:text-sm">
          <span aria-hidden className="text-amber-300">
            📱{" "}
          </span>
          Add BrickValue to your home screen — tap Share then &apos;Add to Home
          Screen&apos;
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-amber-500/20 hover:text-amber-300"
          aria-label="Dismiss install app tip"
        >
          ✕
        </button>
      </div>
    </section>
  );
}
