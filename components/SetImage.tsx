"use client";

import { useState } from "react";
import {
  getSetImageFallback,
  getSetImageUrl,
} from "@/src/lib/setImage";

export type SetImageVariant = "hero" | "card" | "card-lg" | "thumb" | "home";

const VARIANT_STYLES: Record<
  SetImageVariant,
  { container: string; image: string; skeleton: string }
> = {
  hero: {
    container: "relative mb-5 w-full max-h-64 overflow-hidden rounded-xl bg-white/5",
    image: "mx-auto h-64 w-full max-h-64 object-contain p-4",
    skeleton: "rounded-xl",
  },
  card: {
    container: "relative mb-3 h-40 w-full overflow-hidden rounded-xl bg-white/5",
    image: "h-full w-full object-contain p-4",
    skeleton: "rounded-xl",
  },
  "card-lg": {
    container: "relative mb-3 h-48 w-full overflow-hidden rounded-xl bg-white/5",
    image: "h-full w-full object-contain p-4",
    skeleton: "rounded-xl",
  },
  thumb: {
    container:
      "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5",
    image: "h-full w-full object-contain p-1",
    skeleton: "rounded-lg",
  },
  home: {
    container: "relative mb-3 h-32 w-full overflow-hidden rounded-lg bg-white/5",
    image: "h-full w-full object-contain p-2",
    skeleton: "rounded-lg",
  },
};

export function SetImage({
  setNumber,
  setName,
  variant = "thumb",
  className,
  showSetNumberOnFallback = true,
}: {
  setNumber: string;
  setName?: string;
  variant?: SetImageVariant;
  className?: string;
  /** Show set number centered when image fails (results hero) */
  showSetNumberOnFallback?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const styles = VARIANT_STYLES[variant];
  const alt = setName ? `LEGO ${setName}` : `LEGO Set ${setNumber}`;

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      {!loaded && !failed && (
        <div
          className={`absolute inset-0 animate-pulse bg-white/5 ${styles.skeleton}`}
          aria-hidden
        />
      )}
      {failed ? (
        <div className="flex h-full min-h-[4rem] w-full flex-col items-center justify-center gap-2 p-2 text-center">
          <img
            src={getSetImageFallback()}
            alt=""
            className="h-10 w-10 opacity-50"
            loading="lazy"
          />
          {showSetNumberOnFallback && (
            <span className="font-mono text-xs font-medium text-zinc-500">
              #{setNumber}
            </span>
          )}
        </div>
      ) : (
        <img
          src={getSetImageUrl(setNumber)}
          alt={alt}
          loading="lazy"
          className={`${styles.image} transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
