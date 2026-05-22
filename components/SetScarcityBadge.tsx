import type { LegoSet } from "@/lib/analyze";
import { isSetRetired, isSetRetiringSoon } from "@/lib/analyze";

export function SetScarcityBadge({
  set,
  size = "large",
}: {
  set: Pick<LegoSet, "retired" | "retiringSoon"> | undefined;
  size?: "large" | "compact";
}) {
  const retired = isSetRetired(set as LegoSet | undefined);
  const retiringSoon = isSetRetiringSoon(set as LegoSet | undefined);

  if (!retired && !retiringSoon) return null;

  const large = size === "large";

  if (retired) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-xl bg-[#991b1b] font-black text-white ${
          large
            ? "px-4 py-3 text-lg tracking-[0.15em] sm:text-xl"
            : "px-2.5 py-1 text-xs tracking-wide"
        }`}
        role="status"
      >
        <span aria-hidden>🔴</span>
        <span>RETIRED</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-xl bg-[#f59e0b] font-black text-zinc-900 ${
        large
          ? "px-4 py-3 text-base tracking-[0.1em] sm:text-lg"
          : "px-2.5 py-1 text-xs tracking-wide"
      }`}
      role="status"
    >
      <span aria-hidden>⚠️</span>
      <span>RETIRING SOON</span>
    </div>
  );
}

export function RetiringSoonPulseDot() {
  return (
    <span
      className="relative flex h-2.5 w-2.5 shrink-0"
      aria-label="Retiring soon"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f59e0b] opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
    </span>
  );
}
