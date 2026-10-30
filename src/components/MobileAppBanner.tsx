"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "../../lib/isNative";

export function MobileAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("app-banner-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t border-white/10 bg-[#0d0d0d]/95 px-4 py-3 backdrop-blur-md sm:hidden">
      <div className="flex items-center gap-3">
        <img src="/brickvalue-icon.png" alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <p className="text-sm font-bold text-white">BrickValue</p>
          <p className="text-xs text-zinc-400">Free on the App Store</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="https://apps.apple.com/au/app/brickvalue/id6786205578"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black"
          onClick={dismiss}
        >
          Get
        </a>
        <button
          onClick={dismiss}
          className="px-2 py-2 text-zinc-500"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
